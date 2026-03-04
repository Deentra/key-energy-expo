import { promises as fs } from 'fs';
import path from 'path';

export interface DBExhibitor {
  id: string;
  name: string;
  stand: string;
  logo: string;
  favAdd: string;
  favRemove: string;
  website: string;
  description?: string;
  country?: string;
  contact?: string;
  email?: string;
  phone?: string;
  isPVInstaller: number;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface ExhibitorsDB {
  exhibitors: DBExhibitor[];
  lastUpdated: string;
}

const DB_FILE = path.join(process.cwd(), 'public', 'exhibitors-db.json');

async function ensureDir() {
  try {
    const dir = path.dirname(DB_FILE);
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error('Error creating directory:', error);
  }
}

async function readDB(): Promise<ExhibitorsDB> {
  try {
    await ensureDir();
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty
    return { exhibitors: [], lastUpdated: new Date().toISOString() };
  }
}

async function writeDB(db: ExhibitorsDB): Promise<void> {
  try {
    await ensureDir();
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error writing to database:', error);
    throw error;
  }
}

export async function addExhibitor(exhibitor: Omit<DBExhibitor, 'createdAt' | 'updatedAt'>) {
  const db = await readDB();
  const now = new Date().toISOString();

  const existingIndex = db.exhibitors.findIndex((e) => e.id === exhibitor.id);
  if (existingIndex >= 0) {
    const existing = db.exhibitors[existingIndex];
    db.exhibitors[existingIndex] = { ...exhibitor, createdAt: existing.createdAt, updatedAt: now } as DBExhibitor;
  } else {
    db.exhibitors.push({ ...exhibitor, createdAt: now, updatedAt: now } as DBExhibitor);
  }

  db.lastUpdated = now;
  await writeDB(db);
}

export async function getAllExhibitors(): Promise<DBExhibitor[]> {
  const db = await readDB();
  return db.exhibitors;
}

export async function searchExhibitors(
  query: string,
  filters?: { status?: string; isPVInstaller?: boolean; stand?: string }
): Promise<DBExhibitor[]> {
  const db = await readDB();
  let results = db.exhibitors;

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.stand.toLowerCase().includes(q) ||
        (e.description?.toLowerCase().includes(q) ?? false)
    );
  }

  if (filters?.status && filters.status !== 'All') {
    results = results.filter((e) => e.status === filters.status);
  }

  if (filters?.isPVInstaller !== undefined) {
    results = results.filter((e) => (e.isPVInstaller ? true : false) === filters.isPVInstaller);
  }

  if (filters?.stand) {
    results = results.filter((e) => e.stand.includes(filters.stand!));
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateExhibitorStatus(id: string, status: string, notes: string) {
  const db = await readDB();
  const exhibitor = db.exhibitors.find((e) => e.id === id);
  if (exhibitor) {
    exhibitor.status = status;
    exhibitor.notes = notes;
    exhibitor.updatedAt = new Date().toISOString();
    db.lastUpdated = new Date().toISOString();
    await writeDB(db);
  }
}

export async function getExhibitorStats() {
  const db = await readDB();
  const exhibitors = db.exhibitors;

  return {
    total: exhibitors.length,
    new: exhibitors.filter((e) => e.status === 'New').length,
    contacted: exhibitors.filter((e) => e.status === 'Contacted').length,
    successfulLeads: exhibitors.filter((e) => e.status === 'Successful Lead').length,
    rejected: exhibitors.filter((e) => e.status === 'Rejected').length,
    pvInstallers: exhibitors.filter((e) => e.isPVInstaller).length,
  };
}

export async function clearAllExhibitors() {
  const db: ExhibitorsDB = { exhibitors: [], lastUpdated: new Date().toISOString() };
  await writeDB(db);
}

export async function bulkAddExhibitors(exhibitorsList: Omit<DBExhibitor, 'createdAt' | 'updatedAt'>[]) {
  const db = await readDB();
  const now = new Date().toISOString();

  for (const exhibitor of exhibitorsList) {
    const existingIndex = db.exhibitors.findIndex((e) => e.id === exhibitor.id);
    if (existingIndex >= 0) {
      // Preserve existing createdAt when updating
      db.exhibitors[existingIndex] = { 
        ...db.exhibitors[existingIndex],
        ...exhibitor, 
        updatedAt: now 
      };
    } else {
      db.exhibitors.push({ ...exhibitor, createdAt: now, updatedAt: now } as DBExhibitor);
    }
  }

  db.lastUpdated = now;
  await writeDB(db);
}

export async function updateExhibitorPVStatus(exhibitorId: string, isPVInstaller: number) {
  const db = await readDB();
  const exhibitor = db.exhibitors.find((e) => e.id === exhibitorId);
  
  if (exhibitor) {
    exhibitor.isPVInstaller = isPVInstaller;
    exhibitor.updatedAt = new Date().toISOString();
    db.lastUpdated = new Date().toISOString();
    await writeDB(db);
  }
}
