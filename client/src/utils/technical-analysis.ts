import { OHLC } from "../../../server/technical-analysis/transform-data";

type TimeFrame = "5m" | "10m" | "1h" | "1d";

function getConfiguration(timeFrame: TimeFrame) {
  switch (timeFrame) {
    case "5m":
      return { swingLookback: 5, clusterTolerance: 0.002, volumeWeight: 0.4, touchWeight: 0.6 };
    case "10m":
      return { swingLookback: 4, clusterTolerance: 0.003, volumeWeight: 0.45, touchWeight: 0.55 };
    case "1h":
      return { swingLookback: 3, clusterTolerance: 0.005, volumeWeight: 0.5, touchWeight: 0.5 };
    case "1d":
      return { swingLookback: 2, clusterTolerance: 0.01, volumeWeight: 0.6, touchWeight: 0.4 };
    default:
      throw new Error("Unsupported time frame");
  }
}

function parseNumber(value: string): number {
  return parseFloat(value);
}

function detectSwings(data: OHLC[], swingLookback: number): number[] {
  const swings: number[] = [];
  for (let i = swingLookback; i < data.length - swingLookback; i++) {
    const currentHigh = parseNumber(data[i].high);
    const currentLow = parseNumber(data[i].low);
    const currentOpen = parseNumber(data[i].open);
    const currentClose = parseNumber(data[i].close);
    let isSwingHigh = true;
    let isSwingLow = true;
    let isSwingOpenHigh = true;
    let isSwingOpenLow = true;
    let isSwingCloseHigh = true;
    let isSwingCloseLow = true;

    for (let j = 1; j <= swingLookback; j++) {
      if (parseNumber(data[i - j].high) >= currentHigh || parseNumber(data[i + j].high) >= currentHigh) {
        isSwingHigh = false;
      }
      if (parseNumber(data[i - j].low) <= currentLow || parseNumber(data[i + j].low) <= currentLow) {
        isSwingLow = false;
      }
      if (parseNumber(data[i - j].open) >= currentOpen || parseNumber(data[i + j].open) >= currentOpen) {
        isSwingOpenHigh = false;
      }
      if (parseNumber(data[i - j].open) <= currentOpen || parseNumber(data[i + j].open) <= currentOpen) {
        isSwingOpenLow = false;
      }
      if (parseNumber(data[i - j].close) >= currentClose || parseNumber(data[i + j].close) >= currentClose) {
        isSwingCloseHigh = false;
      }
      if (parseNumber(data[i - j].close) <= currentClose || parseNumber(data[i + j].close) <= currentClose) {
        isSwingCloseLow = false;
      }
    }

    if (isSwingHigh) swings.push(currentHigh);
    if (isSwingLow) swings.push(currentLow);
    if (isSwingOpenHigh) swings.push(currentOpen);
    if (isSwingOpenLow) swings.push(currentOpen);
    if (isSwingCloseHigh) swings.push(currentClose);
    if (isSwingCloseLow) swings.push(currentClose);
  }
  return swings;
}

function clusterLevels(swings: number[], clusterTolerance: number): number[] {
  swings.sort((a, b) => a - b);
  const clusters: number[] = [];
  let cluster: number[] = [swings[0]];

  for (let i = 1; i < swings.length; i++) {
    if (Math.abs((swings[i] - cluster[0]) / cluster[0]) <= clusterTolerance) {
      cluster.push(swings[i]);
    } else {
      clusters.push(cluster.reduce((a, b) => a + b) / cluster.length);
      cluster = [swings[i]];
    }
  }

  if (cluster.length > 0) {
    clusters.push(cluster.reduce((a, b) => a + b) / cluster.length);
  }

  return clusters;
}

function calculateStrength(data: OHLC[], levels: number[], config: any): { price: number, strength: number, type: string }[] {
  // Calculate raw strengths
  const rawLevels = levels.map(price => {
    let touchCount = 0;
    let totalVolume = 0;

    data.forEach(candle => {
      const closePrice = parseNumber(candle.close);
      if (Math.abs((closePrice - price) / price) <= config.clusterTolerance) {
        touchCount++;
        totalVolume += candle.volume;
      }
    });

    const strength = touchCount * config.touchWeight + totalVolume * config.volumeWeight;
    const foundCandle = data.find(candle => parseNumber(candle.close) === price);
    const levelType = foundCandle?.close !== undefined && parseNumber(foundCandle.close) >= price ? "resistance" : "support";

    return { price, strength, type: levelType };
  });

  // Find min and max strength
  const strengths = rawLevels.map(l => l.strength);
  const minStrength = Math.min(...strengths);
  const maxStrength = Math.max(...strengths);

  // Normalize strengths to 0-100 scale
  const normalizedLevels = rawLevels.map(l => {
    let normalizedStrength = 0;
    if (maxStrength !== minStrength) {
      normalizedStrength = ((l.strength - minStrength) / (maxStrength - minStrength)) * 100;
    } else {
      normalizedStrength = 100; // If all strengths are equal, set to max 100
    }
    return { 
      price: Math.round(l.price * 100) / 100, 
      strength: Math.round(normalizedStrength * 100) / 100, 
      type: l.type 
    };
  });

  // Filter levels with strength more than 65
  const filteredLevels = normalizedLevels.filter(l => l.strength > 20);
  return filteredLevels;
}

export function findSupportResistance(data: OHLC[], timeFrame: TimeFrame): { price: number, strength: number, type: string }[] {
  const config = getConfiguration(timeFrame);
  const swings = detectSwings(data, config.swingLookback);
  const clusteredLevels = clusterLevels(swings, config.clusterTolerance);
  const levels = calculateStrength(data, clusteredLevels, config);

  return levels.sort((a, b) => b.strength - a.strength);
}

// Example Usage
const ohlcData: OHLC[] = [
  {
    close: "56.79",
    end_time: "2023-09-07T20:11:00Z",
    high: "56.79",
    low: "56.79",
    market_time: "po",
    open: "56.79",
    start_time: "2023-09-07T20:10:00Z",
    total_volume: 13774488,
    volume: 29812
  },
  {
    close: "57.01",
    end_time: "2023-09-07T20:16:00Z",
    high: "57.15",
    low: "56.80",
    market_time: "po",
    open: "56.85",
    start_time: "2023-09-07T20:15:00Z",
    total_volume: 13804300,
    volume: 29812
  }
  // Add more OHLC data here
];

const levels = findSupportResistance(ohlcData, "5m");
console.log("Support and Resistance Levels:", levels);
