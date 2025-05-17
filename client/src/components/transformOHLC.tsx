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

function CandlestickChart({ data, keyLevels = [], width = 1400, ratio = 1 }: { data: any[], keyLevels?: any[], width?: number, ratio?: number }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
const priceLinesRef = useRef<IPriceLine[]>([]);

useEffect(() => {
  if (chartContainerRef.current === null) return;

    if (chartRef.current === null) {
      chartRef.current = createChart(chartContainerRef.current, {
        width: width,
        height: 600,
        layout: {
          background: { type: ColorType.Solid, color: '#FFFFFF' },
          textColor: '#000',
        },
        grid: {
          vertLines: {
            color: '#eee',
          },
          horzLines: {
            color: '#eee',
          },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: '#ccc',
        },
        timeScale: {
          borderColor: '#ccc',
        },
      });
      // Use addSeries with CandlestickSeries constructor
      candleSeriesRef.current = chartRef.current.addSeries(CandlestickSeries);
    }

  if (candleSeriesRef.current) {
    candleSeriesRef.current.setData(
      data.map(d => ({
        time: Math.floor(new Date(d.start_time).getTime() / 1000) as Time,
        open: parseFloat(d.open),
        high: parseFloat(d.high),
        low: parseFloat(d.low),
        close: parseFloat(d.close),
      }))
    );
  }

  // Remove old price lines
  priceLinesRef.current.forEach(line => line.applyOptions({ color: 'transparent' }));
  priceLinesRef.current = [];

  // Add horizontal lines for keyLevels
  priceLinesRef.current = keyLevels.map(level =>
    candleSeriesRef.current!.createPriceLine?.({
      price: level.price,
      color: 'blue',
      lineWidth: 1,
      lineStyle: 2, // dashed
      axisLabelVisible: true,
      title: `Level ${level.strength}`,
    }) as IPriceLine
  );

  return () => {
    priceLinesRef.current.forEach(line => line.applyOptions({ color: 'transparent' }));
    priceLinesRef.current = [];
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    }
  };
}, [data, keyLevels, width]);

  return <div ref={chartContainerRef} />;
}

export const CsvUploader: React.FC = () => {
  const [data, setData] = useState<OHLC[]>([]);
  const [keyLevels, setKeyLevels] = useState<any[]>([]);
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');

  // State for zoom and pan domains
  const [xDomain, setXDomain] = useState<[number, number] | null>(null);
  const [yDomain, setYDomain] = useState<[number, number] | null>(null);

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

  // Zoom and pan handlers
  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    if (!xDomain) return;

    const [minX, maxX] = xDomain;
    const range = maxX - minX;
    const zoomFactor = 0.1; // 10% zoom per wheel event

    // Get mouse position relative to chart container
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseXRatio = mouseX / rect.width;

    // Calculate new range based on zoom direction
    const delta = event.deltaY < 0 ? 1 - zoomFactor : 1 + zoomFactor;
    const newRange = range * delta;

    // Calculate new min and max keeping mouse position fixed
    const newMinX = minX + range * mouseXRatio - newRange * mouseXRatio;
    const newMaxX = newMinX + newRange;

    setXDomain([newMinX, newMaxX]);
  };

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
      {chartType === 'line' ? (
        <div
          style={{ width: '100%', height: 600 }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={lineChartData}
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
              {keyLevels.map((level, idx) => {
                const getStrokeColor = (strength: number) => {
                  if (strength > 80) return 'red';
                  if (strength >= 60 && strength <= 79.99) return 'blue';
                  if (strength >= 35 && strength <= 59.99) return 'green';
                  return 'gray';
                };
                return (
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
                );
              })}
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
