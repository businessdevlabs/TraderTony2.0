import React, { useState, useEffect, useRef } from 'react';
import Papa, { ParseResult } from 'papaparse';
import type { OHLC } from '../../../server/technical-analysis/transform-data'; // import the type definition only
import { findSupportResistance } from '../utils/technical-analysis';
import {
  discontinuousTimeScaleProvider,
  CrossHairCursor,
  MouseCoordinateX,
  MouseCoordinateY,
  EdgeIndicator,
  OHLCTooltip,
  XAxis,
  YAxis,
  StraightLine
} from 'react-financial-charts';

import { createChart, CrosshairMode, IChartApi, ISeriesApi, Time, IPriceLine, ColorType, LineSeries, CandlestickSeries } from 'lightweight-charts';

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

// Fetch 1-minute OHLC data for a given symbol, interval, and month from Alpha Vantage API
async function getApi1minOhlcData(symbol: string, interval: string, month: string, apiKey: string): Promise<any> {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&month=${month}&outputsize=full&apikey=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    const data = await response.json();
    const timeSeriesKey = `Time Series (${interval})`;
    const timeSeries = data[timeSeriesKey];
    if (!timeSeries) {
      throw new Error('Invalid data format from API');
    }

    console.log('data2121', data);
    // Filter data for the specified month (YYYY-MM)
    const filteredData = Object.entries(timeSeries)
      // .filter(([datetime]) => datetime.startsWith(month))
    .map(([datetime, values]) => {
      const v = values as Record<string, string>;
      return {
        datetime,
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close']),
        volume: parseInt(v['5. volume'], 10),
      };
    });
    console.log('data2121Filtered', filteredData);

    return filteredData;
  } catch (error) {
    console.error('Error fetching 1min OHLC data:', error);
    // throw error;
  }
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

function CandlestickChart({ data, keyLevels = [], width = 1200, ratio = 1 }: { data: any[], keyLevels?: any[], width?: number, ratio?: number }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);

// useEffect(() => {
//   if (chartContainerRef.current === null) return;

//     if (chartRef.current === null) {
//       chartRef.current = createChart(chartContainerRef.current, {
//         width: width,
//         height: 600,
//         layout: {
//           background: { type: ColorType.Solid, color: '#FFFFFF' },
//           textColor: '#000',
//         },
//         grid: {
//           vertLines: {
//             color: '#eee',
//           },
//           horzLines: {
//             color: '#eee',
//           },
//         },
//         crosshair: {
//           mode: CrosshairMode.Normal,
//         },
//         rightPriceScale: {
//           borderColor: '#ccc',
//         },
//         timeScale: {
//           borderColor: '#ccc',
//         },
//       });
//       // Use addSeries with CandlestickSeries constructor
//       candleSeriesRef.current = chartRef.current.addSeries(CandlestickSeries);
//     }

//   if (candleSeriesRef.current) {
//     candleSeriesRef.current.setData(
//       data.map(d => ({
//         time: Math.floor(new Date(d.start_time).getTime() / 1000) as Time,
//         open: parseFloat(d.open),
//         high: parseFloat(d.high),
//         low: parseFloat(d.low),
//         close: parseFloat(d.close),
//       }))
//     );
//   }

//   // Remove old price lines
//   priceLinesRef.current.forEach(line => line.applyOptions({ color: 'transparent' }));
//   priceLinesRef.current = [];

//   // Add horizontal lines for keyLevels
//   priceLinesRef.current = keyLevels.map(level =>
//     candleSeriesRef.current!.createPriceLine?.({
//       price: level.price,
//       color: 'blue',
//       lineWidth: 1,
//       lineStyle: 2, // dashed
//       axisLabelVisible: true,
//       title: `Level ${level.strength}`,
//     }) as IPriceLine
//   );

//   return () => {
//     priceLinesRef.current.forEach(line => line.applyOptions({ color: 'transparent' }));
//     priceLinesRef.current = [];
//     if (chartRef.current) {
//       chartRef.current.remove();
//       chartRef.current = null;
//       candleSeriesRef.current = null;
//     }
//   };

// }, [data, keyLevels, width]);

  return <div ref={chartContainerRef} />;
}

export const CsvUploader: React.FC = () => {
  const [data, setData] = useState<OHLC[]>([]);
  const [keyLevels, setKeyLevels] = useState<any[]>([]);
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('candlestick');

  // State for zoom and pan domains
  const [xDomain, setXDomain] = useState<[number, number] | null>(null);
  const [yDomain, setYDomain] = useState<[number, number] | null>(null);

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

  const ticker = 'AAPL';

  useEffect(() => {
    fetchKeyLevels();
    getApi1minOhlcData(ticker, '1min', '2024-12', 'T01W9AUCEIOTSDPU').then(async (ohlcData) => {
      // Prepare data for POST request
      const postData = ohlcData?.map((d: any) => ({
        timestamp: Math.floor(new Date(d.datetime).getTime() / 1000),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
        ticker: ticker, // Adjust as needed or make dynamic
      }));

      try {
        const response = await fetch('http://localhost:3001/ohlc_1m', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: postData }),
        });
        if (!response.ok) {
          console.error('Failed to save 1min OHLC data:', await response.text());
        } else {
          console.log('1min OHLC data saved successfully');
        }
      } catch (error) {
        console.error('Error saving 1min OHLC data:', error);
      }
    });

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

      setData(ohlcArray);

      // Initialize xDomain and yDomain based on data
      if (ohlcArray.length > 0) {
        const xValues = ohlcArray.map(d => new Date(d.start_time).getTime());
        const yValues = ohlcArray.map(d => parseFloat(d.close));
        setXDomain([Math.min(...xValues), Math.max(...xValues)]);
        setYDomain([Math.min(...yValues), Math.max(...yValues)]);
      }
    };
    reader.readAsText(file);
  };

  // Prepare data for line chart
  console.log('lineCharData', data);
  const lineChartData = data.length ? data.map((d, index) => ({
    x: new Date(d.start_time).getTime(),
    y: parseFloat(d.close),
  })) : [];

  // Store filtered data in state to trigger re-render
  const [filteredLineChartData, setFilteredLineChartData] = useState(lineChartData);

  // useEffect(() => {
  //   if (xDomain) {
  //     setFilteredLineChartData(
  //       lineChartData.filter(d => d.x >= xDomain[0] && d.x <= xDomain[1])
  //     );
  //   } else {
  //     setFilteredLineChartData(lineChartData);
  //   }
  // }, [xDomain, lineChartData]);

  // Prepare data for candlestick chart with Date objects for start_time and end_time
  const candlestickChartData = data.length ? data
    .map(d => ({
      ...d,
      start_time: new Date(d.start_time),
      end_time: new Date(d.end_time),
    }))
    .reverse() : [];

  console.log('candlestickChartData22', candlestickChartData);
  const toggleChartType = () => {
    setChartType(prev => (prev === 'line' ? 'candlestick' : 'line'));
  };

  // Calculate minimum y value for YAxis domain
  const minY = lineChartData.length > 0 ? Math.min(...lineChartData.map(d => d.y)) : 0;

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(event.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartX(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || dragStartX === null || !xDomain) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const deltaX = event.clientX - dragStartX;
    const domainRange = xDomain[1] - xDomain[0];
    const pixelPerMs = rect.width / domainRange;

    // Calculate how much to shift domain based on drag distance
    const shiftMs = -deltaX / pixelPerMs;

    let newMinX = xDomain[0] + shiftMs;
    let newMaxX = xDomain[1] + shiftMs;

    // Clamp to data bounds
    const dataMinX = Math.min(...lineChartData.map(d => d.x));
    const dataMaxX = Math.max(...lineChartData.map(d => d.x));
    if (newMinX < dataMinX) {
      newMinX = dataMinX;
      newMaxX = newMinX + domainRange;
    }
    if (newMaxX > dataMaxX) {
      newMaxX = dataMaxX;
      newMinX = newMaxX - domainRange;
    }

    setXDomain([newMinX, newMaxX]);
    setDragStartX(event.clientX);
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      <button style={{ float: 'right', margin: '10px' }} onClick={toggleChartType}>
        Switch to {chartType === 'line' ? 'Candlestick' : 'Line'} Chart
      </button>

      {/* Date range inputs for zoom */}
      {chartType === 'line' && xDomain && (
        <div style={{ margin: '10px 0' }}>
          <label>
            Start Date:{' '}
          <input
            type="date"
            value={new Date(xDomain[0]).toISOString().slice(0, 10)}
            onChange={(e) => {
              const newStart = new Date(e.target.value).getTime();
              if (newStart < xDomain[1]) {
                setXDomain([newStart, xDomain[1]]);
              }
            }}
            key={xDomain[0]} // force re-render on value change
          />
          </label>
          <label style={{ marginLeft: 20 }}>
            End Date:{' '}
            <input
              type="date"
              value={new Date(xDomain[1]).toISOString().slice(0, 10)}
              onChange={(e) => {
                const newEnd = new Date(e.target.value).getTime();
                if (newEnd > xDomain[0]) {
                  setXDomain([xDomain[0], newEnd]);
                }
              }}
            />
          </label>
        </div>
      )}

      {chartType === 'line' ? (
        <div
          style={{ width: '100%', height: 600 }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredLineChartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <RechartsXAxis
                dataKey="x"
                type="number"
                domain={xDomain || ['auto', 'auto']}
                scale="time"
                tickFormatter={(unixTime: string | number | Date) => new Date(unixTime).toLocaleDateString()}
              />
              <RechartsYAxis domain={[minY, 'auto']} />
              <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} />
              <Legend />
              {(() => {
                if (filteredLineChartData.length === 0) return null;
                const lastPrice = filteredLineChartData[filteredLineChartData.length - 1].y;
                const lowerBound = lastPrice * 0.8;
                const upperBound = lastPrice * 1.2;
                const filteredLevels = keyLevels.filter(level => level.price >= lowerBound && level.price <= upperBound);
                const getStrokeColor = (strength: number) => {
                  if (strength > 80) return 'red';
                  if (strength >= 60 && strength <= 79.99) return 'blue';
                  if (strength >= 35 && strength <= 59.99) return 'green';
                  return 'gray';
                };
                return filteredLevels.map((level, idx) => (
                  <ReferenceLine
                    key={idx}
                    y={level.price}
                    stroke={getStrokeColor(level.strength)}
                    strokeDasharray="3 3"
                    label={{
                      position: 'right',
                      value: `${level.strength}`,
                      fill: getStrokeColor(level.strength),
                      fontSize: 12,
                    }}
                  />
                ));
              })()}
              <Line type="monotone" dataKey="y" stroke="#8884d8" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <CandlestickChart data={candlestickChartData} keyLevels={keyLevels} />
      )}
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <pre>{JSON.stringify(keyLevels, null, 2)}</pre>
    </div>
  );
};

// Second CsvUploader component removed to fix duplicate declaration
