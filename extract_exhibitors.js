import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('installers-list.html', 'utf8');
const $ = cheerio.load(html);

const exhibitors = [];

$('.listing-data-object-main-item').each((i, el) => {
  const name = $(el).find('.card-digitalprofile-name').text().trim();
  const stand = $(el).find('.card-digitalprofile-position p.line-clamp-2').text().trim();
  const id = $(el).find('button.digitalprofile-favorites-action').attr('data-id') || i.toString();
  const detailHref = $(el).find('a.btn-plain').attr('href') || '#';
  const website = detailHref.startsWith('http') ? detailHref : `https://www.key-expo.com${detailHref}`;

  if (name) {
    exhibitors.push({
      id,
      name,
      stand,
      category: 'Exhibitor',
      isPVInstaller: false,
      status: 'New',
      notes: '',
      website
    });
  }
});

// Remove duplicates by ID
const uniqueExhibitors = Array.from(new Map(exhibitors.map(ex => [ex.id, ex])).values());

const tsContent = `export interface Exhibitor {
  id: string;
  name: string;
  stand: string;
  category: string;
  isPVInstaller: boolean;
  status: 'New' | 'Contacted' | 'Successful Lead' | 'Rejected';
  notes: string;
  website: string;
}

export const initialExhibitors: Exhibitor[] = ${JSON.stringify(uniqueExhibitors, null, 2)};
`;

fs.writeFileSync('src/lib/exhibitors.ts', tsContent);
console.log(`Extracted ${uniqueExhibitors.length} unique exhibitors.`);
