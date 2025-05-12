// TypeScript: Transform CSV OHLC data to JSON OHLC[]

// Install dependencies:
//   npm install csv-parse
//   (Optional: npm install --save-dev @types/csv-parse for TypeScript types)

import fs from 'fs';
import path from 'path';
// Use the synchronous parse function from csv-parse/sync
import { parse } from 'csv-parse/sync';

export type OHLC = {
  close: string;
  end_time: string;
  high: string;
  low: string;
  market_time: string;
  open: string;
  start_time: string;
  total_volume: number;
  volume: number;
};

// Load CSV file (ensure encoding UTF-8)
const csvContent = fs.readFileSync(
  path.resolve(__dirname, 'ohlc.csv'),
  'utf8'
);

// Parse CSV into records (returns any[])
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as Record<string, string>[];

// Helper to convert volume strings (e.g., '50.48M', '12K')
function parseVolume(vol: string): number {
  if (vol.endsWith('M')) {
    return Math.round(parseFloat(vol) * 1_000_000);
  }
  if (vol.endsWith('K')) {
    return Math.round(parseFloat(vol) * 1_000);
  }
  return parseInt(vol.replace(/,/g, ''), 10);
}

// Transform each CSV row into the OHLC type
const ohlcArray: OHLC[] = records.map((row) => ({
  close: row['Price'],
  high: row['High'],
  low: row['Low'],
  open: row['Open'],
  market_time: 'regular',
  start_time: new Date(row['Date'])
    .toISOString()
    .replace(/T.*$/, 'T00:00:00Z'),
  end_time: new Date(row['Date'])
    .toISOString()
    .replace(/T.*$/, 'T23:59:00Z'),
  total_volume: parseVolume(row['Vol.']),
  volume: parseVolume(row['Vol.']),
}));

// Write the JSON output file
fs.writeFileSync(
  path.resolve(__dirname, 'ohlc_data.json'),
  JSON.stringify(ohlcArray, null, 2),
  'utf8'
);