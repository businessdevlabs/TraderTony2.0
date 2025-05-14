import React, { useState } from 'react';
import Papa, { ParseResult } from 'papaparse';
import type { OHLC } from '../../../server/technical-analysis/transform-data'; // import the type definition only
import { findSupportResistance } from '../utils/technical-analysis';

function parseVolume(vol: string): number {
  if (vol.endsWith('M')) return Math.round(parseFloat(vol) * 1e6);
  if (vol.endsWith('K')) return Math.round(parseFloat(vol) * 1e3);
  return parseInt(vol.replace(/,/g, ''), 10);
}

function transformCsvToOhlc(csvText: string): OHLC[] {
  const results = (Papa.parse as any)(csvText, {
    header: true,
    skipEmptyLines: true,
    trim: true,
  });
  const records = results.data as Record<string, string>[];
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
      const levels = findSupportResistance(ohlcArray, "1d");
      console.log('levels22', levels)
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
