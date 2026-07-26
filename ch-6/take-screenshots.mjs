import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots');
const BASE = 'http://localhost:3001';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  defaultViewport: { width: 1280, height: 800 },
});

const page = await browser.newPage();

async function shot(name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log('saved', file);
}

// 1) Default view — Travel style City explorer (default)
await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForSelector('#style');
await page.select('#style', 'city');
await page.waitForTimeout?.(400);
await new Promise((r) => setTimeout(r, 500));
await shot('screenshot-default-view.png');

// 2) Form filled with City style (sample / pre-generate view)
await page.$eval('#destination', (el) => { el.value = 'Tokyo'; });
await page.$eval('#days', (el) => { el.value = '2'; });
await page.$eval('#budget', (el) => { el.value = '2000'; });
await page.select('#style', 'city');
await page.$eval('#includeFood', (el) => { el.checked = false; });
await new Promise((r) => setTimeout(r, 400));
await shot('screenshot-sample-data.png');

// 3) Generated daily plan with City style
await page.click('#generateBtn');
try {
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return text.includes('Trip Summary') || text.includes('Day 1') || text.includes('SAMPLE DATA') || text.includes('LIVE OSM');
    },
    { timeout: 120000 }
  );
} catch (err) {
  console.error('Generate wait failed:', err.message);
  console.log('page text snippet:', (await page.evaluate(() => document.body.innerText)).slice(0, 500));
}

// Scroll itinerary into a nice frame — capture full page for the plan
await new Promise((r) => setTimeout(r, 800));
const itinerary = await page.$('#itinerary');
if (itinerary) {
  await itinerary.screenshot({ path: path.join(OUT, 'screenshot-daily-plan.png') });
  console.log('saved', path.join(OUT, 'screenshot-daily-plan.png'));
} else {
  await page.screenshot({ path: path.join(OUT, 'screenshot-daily-plan.png'), fullPage: true });
  console.log('saved fullpage daily plan');
}

await browser.close();
console.log('done');
