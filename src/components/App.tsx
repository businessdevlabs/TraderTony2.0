import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { calculateKeyLevels } from '../utils/technical-analysis';

export interface OHLCData {
  id: number;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface KeyLevel {
  id: number;
  price: number;
  ticker: string;
  strength: string;
  last_date: string;
}

const App: React.FC = () => {
  const [dailyOhlcData, setDailyOHLCData] = useState<OHLCData[]>([]);
  const [weeklyOhlcData, setWeeklyOHLCData] = useState<OHLCData[]>([]);
  const [monthlyOhlcData, setMonthlyOHLCData] = useState<OHLCData[]>([]);
  const [keyLevels, setKeyLevels] = useState<KeyLevel[]>([]);
  const ticker = "SAMPLE_TICKER"; // This should be dynamic in a real app

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dailyRes, weeklyRes, monthlyRes, keyLevelsRes] = await Promise.all([
          axios.get<OHLCData[]>('/api/ohlc/1d'), 
          axios.get<OHLCData[]>('/api/ohlc/1w'), 
          axios.get<OHLCData[]>('/api/ohlc/1mo'), 
          axios.get<KeyLevel[]>('/api/key-levels') 
        ]);

        setDailyOHLCData(dailyRes.data);
        setWeeklyOHLCData(weeklyRes.data); // Ensure API returns data for these or mock them
        setMonthlyOHLCData(monthlyRes.data); // Ensure API returns data for these or mock them
        
        // Calculate key levels once all OHLC data is fetched
        if (dailyRes.data.length > 0 && weeklyRes.data.length > 0 && monthlyRes.data.length > 0) {
          const calculatedLevels = calculateKeyLevels(dailyRes.data, weeklyRes.data, monthlyRes.data, ticker);
          setKeyLevels(calculatedLevels);
          // Optionally, save these calculated levels to the backend
          if (calculatedLevels.length > 0) {
            await axios.post('/api/key-levels', { levels: calculatedLevels, ticker });
          }
        } else {
          // Fallback to fetched key levels if calculation isn't possible (e.g., missing data)
          setKeyLevels(keyLevelsRes.data);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
        // Fallback or error handling
        setDailyOHLCData([]); // Set to empty or handle error state
        setWeeklyOHLCData([]);
        setMonthlyOHLCData([]);
        setKeyLevels([]);
      }
    };

    fetchData();
  }, [ticker]); // Added ticker to dependency array if it can change

  return (
    <div>
      <h1>Trade Tony 2.0</h1>
      <h2>OHLC Data</h2>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Open</th>
            <th>High</th>
            <th>Low</th>
            <th>Close</th>
          </tr>
        </thead>
        <tbody>
          {dailyOhlcData.map((data) => (
            <tr key={data.id}>
              <td>{data.timestamp}</td>
              <td>{data.open}</td>
              <td>{data.high}</td>
              <td>{data.low}</td>
              <td>{data.close}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Key Levels</h2>
      <table>
        <thead>
          <tr>
            <th>Price</th>
            <th>Ticker</th>
            <th>Strength</th>
            <th>Last Date</th>
          </tr>
        </thead>
        <tbody>
          {keyLevels.map((level) => (
            <tr key={level.id}>
              <td>{level.price}</td>
              <td>{level.ticker}</td>
              <td>{level.strength}</td>
              <td>{level.last_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;
