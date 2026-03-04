import { getAllExhibitors, updateExhibitorPVStatus } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const METADATA_PV_KEYWORDS = [
  'photovoltaic',
  'photovoltaics',
  'pv',
  'solar',
  'solar panel',
  'photovoltaik',
  'fotovoltaico',
  'energia solar',
  'energia rinnovabile',
  'rinnovabile',
  'renewable energy',
  'pannelli solari',
  'green energy',
];

const PROFILE_INSTALLER_STRONG_KEYWORDS = [
  'solar installer',
  'pv installer',
  'photovoltaic installer',
  'installatore fotovoltaico',
  'installatore solare',
  'impianti fotovoltaici',
  'impianto fotovoltaico',
  'installazione fotovoltaica',
  'installation of photovoltaic',
  'epc',
  'system integrator',
  'design and installation',
  'turnkey solar',
];

const PROFILE_INSTALLER_SUPPORTING_KEYWORDS = [
  'photovoltaic',
  'solar',
  'pv',
  'solar energy',
  'renewable energy',
  'battery storage',
  'inverter',
  'energy storage',
  'self-consumption',
  'residential solar',
  'commercial solar',
  'industrial solar',
  'rooftop solar',
  'agrivoltaics',
  'smart energy',
];

const PROFILE_NON_INSTALLER_KEYWORDS = [
  'manufacturer',
  'manufacturing',
  'producer',
  'distributor',
  'wholesaler',
  'retailer',
  'trading company',
  'import export',
  'component supplier',
];

const PROFILE_BASE_URL = 'https://www.key-expo.com';
const FETCH_TIMEOUT_MS = 8000;
const MAX_PROFILE_TEXT_LENGTH = 12000;
const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 10000;

type JobState = 'idle' | 'running' | 'completed' | 'failed' | 'paused';

interface RecognizerJob {
  state: JobState;
  startedAt: string | null;
  endedAt: string | null;
  totalCandidates: number;
  processed: number;
  recognized: number;
  recognizedIds: string[];
  crawledProfiles: number;
  metadataMatches: number;
  profileMatches: number;
  error: string | null;
  isPaused: boolean;
}

const recognizerJob: RecognizerJob = {
  state: 'idle',
  startedAt: null,
  endedAt: null,
  totalCandidates: 0,
  processed: 0,
  recognized: 0,
  recognizedIds: [],
  crawledProfiles: 0,
  metadataMatches: 0,
  profileMatches: 0,
  error: null,
  isPaused: false,
};

function getJobSnapshot() {
  return {
    ...recognizerJob,
    progress: recognizerJob.totalCandidates > 0
      ? Math.round((recognizerJob.processed / recognizerJob.totalCandidates) * 100)
      : 0,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalizeProfileUrl(website: string) {
  if (!website) return '';

  if (website.startsWith('http://') || website.startsWith('https://')) {
    return website;
  }

  if (website.startsWith('/')) {
    return `${PROFILE_BASE_URL}${website}`;
  }

  return `${PROFILE_BASE_URL}/${website}`;
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; KeyEnergyPVBot/1.0)',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      return '';
    }

    return await response.text();
  } catch {
    return '';
  } finally {
    clearTimeout(timeoutId);
  }
}

function stripHtmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function calculateInstallerScore(text: string) {
  let score = 0;

  for (const keyword of PROFILE_INSTALLER_STRONG_KEYWORDS) {
    if (text.includes(keyword)) score += 3;
  }

  for (const keyword of PROFILE_INSTALLER_SUPPORTING_KEYWORDS) {
    if (text.includes(keyword)) score += 1;
  }

  for (const keyword of PROFILE_NON_INSTALLER_KEYWORDS) {
    if (text.includes(keyword)) score -= 2;
  }

  return score;
}

function isMetadataPVCandidate(name: string, description = '') {
  const text = `${name} ${description}`.toLowerCase();
  return includesAny(text, METADATA_PV_KEYWORDS);
}

async function detectInstallerFromProfile(name: string, description: string, website: string) {
  const metadataText = `${name} ${description || ''}`.toLowerCase();
  const metadataScore = calculateInstallerScore(metadataText);

  const profileUrl = normalizeProfileUrl(website);
  if (!profileUrl) {
    return {
      isInstaller: metadataScore >= 3,
      metadataScore,
      profileScore: 0,
      profileUrl: '',
      source: 'metadata' as const,
    };
  }

  const html = await fetchWithTimeout(profileUrl, FETCH_TIMEOUT_MS);
  if (!html) {
    return {
      isInstaller: metadataScore >= 3,
      metadataScore,
      profileScore: 0,
      profileUrl,
      source: 'metadata' as const,
    };
  }

  const profileText = stripHtmlToText(html).slice(0, MAX_PROFILE_TEXT_LENGTH);
  const profileScore = calculateInstallerScore(profileText);
  const combinedScore = metadataScore + profileScore;

  return {
    isInstaller: combinedScore >= 5 || (profileScore >= 4 && metadataScore >= 1),
    metadataScore,
    profileScore,
    profileUrl,
    source: 'profile' as const,
  };
}

async function runRecognizerInBackground() {
  try {
    const exhibitors = await getAllExhibitors();
    const candidates = exhibitors
      .filter((exhibitor) => !exhibitor.isPVInstaller);

    recognizerJob.totalCandidates = candidates.length;
    console.log(`[PV Recognizer] started background scan. candidates=${candidates.length}, batchSize=${BATCH_SIZE}`);

    for (let index = 0; index < candidates.length; index += BATCH_SIZE) {
      // Check if paused and wait
      while (recognizerJob.isPaused) {
        await delay(500);
      }

      // Check if state changed to failed/completed (user stopped it)
      if (recognizerJob.state !== 'running' && recognizerJob.state !== 'paused') {
        break;
      }

      const batch = candidates.slice(index, index + BATCH_SIZE);
      const batchIndex = Math.floor(index / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(candidates.length / BATCH_SIZE);
      console.log(`[PV Recognizer] processing batch ${batchIndex}/${totalBatches} (${batch.length} companies)`);

      for (const exhibitor of batch) {
        const result = await detectInstallerFromProfile(
          exhibitor.name,
          exhibitor.description || '',
          exhibitor.website || ''
        );

        if (result.profileUrl) {
          recognizerJob.crawledProfiles++;
        }

        if (result.isInstaller) {
          await updateExhibitorPVStatus(exhibitor.id, 1);
          recognizerJob.recognized++;
          recognizerJob.recognizedIds.push(exhibitor.id);

          if (result.source === 'profile') {
            recognizerJob.profileMatches++;
          } else {
            recognizerJob.metadataMatches++;
          }
        }

        recognizerJob.processed++;
      }

      console.log(`[PV Recognizer] progress ${recognizerJob.processed}/${recognizerJob.totalCandidates}, recognized=${recognizerJob.recognized}`);

      if (index + BATCH_SIZE < candidates.length) {
        console.log(`[PV Recognizer] waiting 10 seconds before next batch...`);
        await delay(BATCH_DELAY_MS);
      }
    }

    recognizerJob.state = 'completed';
    recognizerJob.endedAt = new Date().toISOString();
    console.log(`[PV Recognizer] completed. recognized=${recognizerJob.recognized}, crawledProfiles=${recognizerJob.crawledProfiles}`);
  } catch (error) {
    recognizerJob.state = 'failed';
    recognizerJob.error = String(error);
    recognizerJob.endedAt = new Date().toISOString();
    console.error('[PV Recognizer] failed:', error);
  }
}

export async function GET() {
  return Response.json({
    success: true,
    job: getJobSnapshot(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action as string | undefined;

    if (action === 'pause') {
      if (recognizerJob.state !== 'running') {
        return Response.json(
          { success: false, message: 'Recognizer is not running' },
          { status: 400 }
        );
      }
      recognizerJob.isPaused = true;
      recognizerJob.state = 'paused';
      console.log('[PV Recognizer] paused by user');
      return Response.json({ success: true, job: getJobSnapshot() });
    }

    if (action === 'resume') {
      if (recognizerJob.state !== 'paused') {
        return Response.json(
          { success: false, message: 'Recognizer is not paused' },
          { status: 400 }
        );
      }
      recognizerJob.isPaused = false;
      recognizerJob.state = 'running';
      console.log('[PV Recognizer] resumed by user');
      return Response.json({ success: true, job: getJobSnapshot() });
    }

    if (action === 'stop') {
      recognizerJob.state = 'completed';
      recognizerJob.endedAt = new Date().toISOString();
      console.log('[PV Recognizer] stopped by user at ${recognizerJob.processed}/${recognizerJob.totalCandidates}');
      return Response.json({ success: true, job: getJobSnapshot() });
    }

    if (recognizerJob.state === 'running' || recognizerJob.state === 'paused') {
      return Response.json({
        success: true,
        message: 'Recognizer is already running in background',
        job: getJobSnapshot(),
      });
    }

    const exhibitors = await getAllExhibitors();
    if (!exhibitors || exhibitors.length === 0) {
      return Response.json(
        {
          success: false,
          message: 'No exhibitors found in database',
        },
        { status: 400 }
      );
    }

    recognizerJob.state = 'running';
    recognizerJob.isPaused = false;
    recognizerJob.startedAt = new Date().toISOString();
    recognizerJob.endedAt = null;
    recognizerJob.totalCandidates = 0;
    recognizerJob.processed = 0;
    recognizerJob.recognized = 0;
    recognizerJob.recognizedIds = [];
    recognizerJob.crawledProfiles = 0;
    recognizerJob.metadataMatches = 0;
    recognizerJob.profileMatches = 0;
    recognizerJob.error = null;

    console.log('[PV Recognizer] job queued by user request');
    void runRecognizerInBackground();

    return Response.json({
      success: true,
      message: 'PV recognizer started in background',
      job: getJobSnapshot(),
    });
  } catch (error) {
    console.error('Error recognizing PV installers:', error);
    return Response.json(
      { success: false, message: 'Failed to recognize PV installers', error: String(error) },
      { status: 500 }
    );
  }
}
