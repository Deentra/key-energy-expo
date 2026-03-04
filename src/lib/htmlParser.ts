import * as cheerio from 'cheerio';

export interface ParsedExhibitor {
  id: string;
  name: string;
  stand: string;
  logo: string;
  favAdd: string;
  favRemove: string;
  website: string;
  description?: string;
}

export function parseExhibitorCard(htmlContent: string): ParsedExhibitor | null {
  try {
    const $ = cheerio.load(htmlContent);

    // Extract company name
    const name = $('.card-digitalprofile-name').text().trim();
    if (!name) {
      console.log(`     ↳ ⚠️  No name found`);
      return null;
    }

    // Extract stand/position
    const standText = $('.card-digitalprofile-position p:last-child').text().trim();

    // Extract logo
    const logoSrc = $('img[data-twe-lazy-src]').attr('data-twe-lazy-src') || 
                    $('img').attr('src') || '';

    // Extract favorite URLs
    const favButton = $('.digitalprofile-favorites-action');
    const favAdd = favButton.attr('data-action') || '';
    const favRemove = favButton.attr('data-action-opposite') || '';
    const id = favButton.attr('data-id') || '';

    // Extract profile link
    const profileLink = $('.card-digitalprofile-cta-wrapper a').attr('href') || '';

    // Extract description if available
    const description = $('[data-twe-modal-body-ref] p').text().trim() || '';

    return {
      id,
      name,
      stand: standText,
      logo: logoSrc,
      favAdd,
      favRemove,
      website: profileLink,
      description: description || undefined,
    };
  } catch (error) {
    console.error('Error parsing exhibitor card:', error);
    return null;
  }
}

export function extractExhibitorDataFromPage(htmlContent: string): ParsedExhibitor[] {
  try {
    const $ = cheerio.load(htmlContent);
    const exhibitors: ParsedExhibitor[] = [];

    // Look for all exhibitor cards
    const cards = $('.card-digitalprofile');
    console.log(`   🔍 Found ${cards.length} .card-digitalprofile elements`);

    if (cards.length === 0) {
      // Try alternative selectors for debugging
      console.log(`   ℹ️  No .card-digitalprofile found. Checking for alternatives...`);
      const divCount = $('div').length;
      const classNames = new Set<string>();
      $('[class]').each((i, elem) => {
        const classes = $(elem).attr('class') || '';
        if (classes.includes('card') || classes.includes('profile')) {
          classNames.add(classes);
        }
      });
      console.log(`   ℹ️  Total divs: ${divCount}`);
      console.log(`   ℹ️  Card-like classes: ${Array.from(classNames).slice(0, 5).join(', ')}`);
    }

    cards.each((i, elem) => {
      const cardHtml = $(elem).html() || '';
      const parsed = parseExhibitorCard(cardHtml);
      if (parsed && parsed.id && parsed.name) {
        exhibitors.push(parsed);
        if (i < 3) {
          console.log(`   └─ Card ${i + 1}: ${parsed.name} (${parsed.id})`);
        }
      } else if (parsed) {
        console.log(`   ⚠️  Card ${i + 1} missing ID or name:`, { id: parsed.id, name: parsed.name });
      }
    });

    return exhibitors;
  } catch (error) {
    console.error('Error extracting exhibitors from page:', error);
    return [];
  }
}

export function extractTotalItems(htmlContent: string): number {
  try {
    const $ = cheerio.load(htmlContent);
    // Look for pagination or total items indicator
    const paginationText = $('[class*="pagination"]').text() || '';
    const match = paginationText.match(/of\s+(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    // Alternative: count cards on current page as fallback
    const cardCount = $('.card-digitalprofile').length;
    return cardCount;
  } catch (error) {
    console.error('Error extracting total items:', error);
    return 0;
  }
}
