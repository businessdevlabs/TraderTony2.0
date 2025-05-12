import React, { useState } from 'react';
import { parse } from 'csv-parse/sync';
import type { OHLC } from '../../../server/technical-analysis/transform-data'; // import the type definition only

function parseVolume(vol: string): number {
  if (vol.endsWith('M')) return Math.round(parseFloat(vol) * 1e6);
  if (vol.endsWith('K')) return Math.round(parseFloat(vol) * 1e3);
  return parseInt(vol.replace(/,/g, ''), 10);
}

function transformCsvToOhlc(csvText: string): OHLC[] {
  const records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  return records.map(row => ({
    close: row['Price'],
    high: row['High'],
    low: row['Low'],
    open: row['Open'],
    market_time: 'regular',
    start_time: new Date(row['Date']).toISOString().replace(/T.*$/, 'T00:00:00Z'),
    end_time: new Date(row['Date']).toISOString().replace(/T.*$/, 'T23:59:00Z'),
    total_volume: parseVolume(row['Vol.']),
    volume: parseVolume(row['Vol.']),
  }));
}

export const CsvUploader: React.FC = () => {
  const [data, setData] = useState<OHLC[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const ohlcArray = transformCsvToOhlc(text);
      setData(ohlcArray);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};