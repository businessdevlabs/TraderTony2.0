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
    reader.onload = async () => {
      const text = reader.result as string;
      const ohlcArray = transformCsvToOhlc(text);
      const levels = findSupportResistance(ohlcArray, "1d");
      console.log('levels22', levels);

      // Call API to save levels
      try {
        console.log('saving Data');
        const response = await fetch('/saveKeyLevels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            levels: levels.map(level => ({
              price: level.price,
              strength: level.strength,
              last_date: new Date().toISOString(),
            })),
            ticker: 'defaultTicker', // Adjust ticker as needed
          }),
        });
        console.log('saving Data response', response);

        if (!response.ok) {
          console.error('Failed to save key levels:', await response.text());
        } else {
          console.log('Key levels saved successfully');
        }
      } catch (error) {
        console.error('Error saving key levels:', error);
      }

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
