import React, { useState, useEffect } from 'react';
import Papa, { ParseResult } from 'papaparse';
import type { OHLC } from '../../../server/technical-analysis/transform-data'; // import the type definition only
import { findSupportResistance } from '../utils/technical-analysis';
import {
  ChartCanvas,
  Chart,
  CandlestickSeries,
  discontinuousTimeScaleProvider,
  CrossHairCursor,
  MouseCoordinateX,
  MouseCoordinateY,
  EdgeIndicator,
  OHLCTooltip,
  XAxis,
  YAxis,
} from 'react-financial-charts';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ComposedChart,
  Bar,
} from 'recharts';

// Helper function to parse volume strings (e.g., '50.48M', '12K')
function parseVolume(vol: string): number {
  if (vol.endsWith('M')) return Math.round(parseFloat(vol) * 1e6);
  if (vol.endsWith('K')) return Math.round(parseFloat(vol) * 1e3);
  return parseInt(vol.replace(/,/g, ''), 10);
}

// Transform CSV data to OHLC format
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
    start_time: new Date(row['Date']).toISOString(),
    end_time: new Date(row['Date']).toISOString(),
    total_volume: parseVolume(row['Vol.']),
    volume: parseVolume(row['Vol.']),
  }));
}

// Define the CandlestickChart component
function CandlestickChart({ data, width = 800, ratio = 1 }: { data: any[], width?: number, ratio?: number }) {
  const xScaleProvider = discontinuousTimeScaleProvider.inputDateAccessor(
    (d: any) => d.start_time
  );
  const { data: chartData, xScale, xAccessor, displayXAccessor } = xScaleProvider(data);

  const start = xAccessor(chartData[chartData.length - 1]);
  const end = xAccessor(chartData[Math.max(0, chartData.length - 100)]);
  const xExtents = [start, end];

  return (
    <ChartCanvas
      height={400}
      width={width}
      ratio={ratio}
      margin={{ left: 50, right: 50, top: 10, bottom: 30 }}
      seriesName="OHLC"
      data={chartData}
      xScale={xScale}
      xAccessor={xAccessor}
      displayXAccessor={displayXAccessor}
      xExtents={xExtents}
    >
      <Chart id={1} yExtents={(d: any) => [d.high, d.low]}>
        <XAxis />
        <YAxis />
        <CandlestickSeries />
        <MouseCoordinateX
          at="bottom"
          orient="bottom"
          displayFormat={(d: any) => d.toLocaleDateString()}
        />
        <MouseCoordinateY
          at="right"
          orient="right"
          displayFormat={(d: any) => d.toFixed(2)}
        />
        <EdgeIndicator
          itemType="last"
          orient="right"
          edgeAt="right"
          yAccessor={(d: any) => d.close}
          fill={(d: any) => (d.close > d.open ? '#6BA583' : '#FF0000')}
        />
        <OHLCTooltip origin={[-40, 0]} />
      </Chart>
      <CrossHairCursor />
    </ChartCanvas>
  );
}

export const CsvUploader: React.FC = () => {
  const [data, setData] = useState<OHLC[]>([]);
  const [keyLevels, setKeyLevels] = useState<any[]>([]);
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');

  useEffect(() => {
    // Fetch key levels on component mount
    const fetchKeyLevels = async () => {
      try {
        const response = await fetch('http://localhost:3001/key-levels');
        if (!response.ok) {
          console.error('Failed to fetch key levels:', await response.text());
          return;
        }
        const levels = await response.json();
        console.log('keyLevels', levels);
        setKeyLevels(levels.data || []);
      } catch (error) {
        console.error('Error fetching key levels:', error);
      }
    };
    fetchKeyLevels();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result as string;
      const ohlcArray = transformCsvToOhlc(text);
      const levels = findSupportResistance(ohlcArray, "1d");
      console.log('levels22', levels);

      // Call API to save levels with explicit backend port
      try {
        const response = await fetch('http://localhost:3001/key-levels', {
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
            timeframe: '1d', // Add timeframe to match backend requirement
          }),
        });
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

  // Prepare data for line chart
  console.log('lineCharData', data);
  const lineChartData = data.length ? data.map((d, index) => ({
    x: new Date(d.start_time).getTime(),
    y: parseFloat(d.close),
  })) : [];

  // Prepare data for candlestick chart with Date objects for start_time and end_time
  const candlestickChartData = data.length ? data.map(d => ({
    ...d,
    start_time: new Date(d.start_time),
    end_time: new Date(d.end_time),
  })) : [];

  const toggleChartType = () => {
    setChartType(prev => (prev === 'line' ? 'candlestick' : 'line'));
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      <button style={{ float: 'right', margin: '10px' }} onClick={toggleChartType}>
        Switch to {chartType === 'line' ? 'Candlestick' : 'Line'} Chart
      </button>
      {chartType === 'line' ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={lineChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <RechartsXAxis
              dataKey="x"
              type="number"
              domain={['auto', 'auto']}
              scale="time"
              tickFormatter={(unixTime: string | number | Date) => new Date(unixTime).toLocaleTimeString()}
            />
            <RechartsYAxis />
            <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} />
            <Legend />
            {keyLevels.map((level, idx) => (
              <ReferenceLine
                key={idx}
                y={level.price}
                stroke="red"
                strokeDasharray="3 3"
                label={{
                  position: 'right',
                  value: `Strength: ${level.strength}`,
                  fill: 'red',
                  fontSize: 12,
                }}
              />
            ))}
            <Line type="monotone" dataKey="y" stroke="#8884d8" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <CandlestickChart data={candlestickChartData} />
      )}
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <pre>{JSON.stringify(keyLevels, null, 2)}</pre>
    </div>
  );
};

// Second CsvUploader component removed to fix duplicate declaration
