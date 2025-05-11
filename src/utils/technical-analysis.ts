import { OHLCData, KeyLevel } from '../components/App';

// Helper function to check if a date is the first day of the month
function isFirstDayOfMonth(date: Date): boolean {
  return date.getDate() === 1;
}

// Helper function to check if a date is the first day of the week (Sunday)
function isFirstDayOfWeek(date: Date): boolean {
  return date.getDay() === 0; // 0 for Sunday
}

export function calculateKeyLevels(dailyOhlcData: OHLCData[], weeklyOhlcData: OHLCData[], monthlyOhlcData: OHLCData[], ticker: string): KeyLevel[] {
  const keyLevels: KeyLevel[] = [];
  let idCounter = 0;

  const addKeyLevel = (price: number, strength: 'strong' | 'medium' | 'low', date: string) => {
    // Avoid adding duplicate levels for the same price and strength
    if (!keyLevels.some(kl => kl.price === price && kl.strength === strength)) {
      keyLevels.push({
        id: idCounter++,
        price,
        ticker,
        strength,
        last_date: date,
      });
    }
  };

  // Process Monthly Data for Strong Levels
  monthlyOhlcData.forEach(data => {
    const dateStr = data.timestamp;
    addKeyLevel(data.open, 'strong', dateStr);
    addKeyLevel(data.high, 'strong', dateStr);
    addKeyLevel(data.low, 'strong', dateStr);
    addKeyLevel(data.close, 'strong', dateStr);
  });

  // Process Weekly Data for Strong and Medium Levels
  weeklyOhlcData.forEach(data => {
    const dateStr = data.timestamp;
    // Check if it's also a monthly level (already added as strong)
    const isMonthly = monthlyOhlcData.some(m => m.open === data.open || m.high === data.high || m.low === data.low || m.close === data.close);
    const strength = isMonthly ? 'strong' : 'medium';

    addKeyLevel(data.open, strength, dateStr);
    addKeyLevel(data.high, strength, dateStr);
    addKeyLevel(data.low, strength, dateStr);
    addKeyLevel(data.close, strength, dateStr);
  });

  // Process Daily Data for Medium and Low Levels
  dailyOhlcData.forEach(data => {
    const dateStr = data.timestamp;
    const isWeekly = weeklyOhlcData.some(w => w.open === data.open || w.high === data.high || w.low === data.low || w.close === data.close);
    // If it's also a monthly level, it's already 'strong'
    const isMonthly = monthlyOhlcData.some(m => m.open === data.open || m.high === data.high || m.low === data.low || m.close === data.close);

    let strength: 'strong' | 'medium' | 'low' = 'low';
    if (isMonthly) {
      strength = 'strong';
    } else if (isWeekly) {
      strength = 'medium';
    }

    addKeyLevel(data.open, strength, dateStr);
    addKeyLevel(data.high, strength, dateStr);
    addKeyLevel(data.low, strength, dateStr);
    addKeyLevel(data.close, strength, dateStr);
  });
  
  // For "Low" strength, the definition also includes coincidence with hourly and 10-minute charts.
  // This part is simplified for now as we are only using D, W, M data.
  // A more complete implementation would fetch and compare H1 and M10 data.

  // Deduplicate and rank
  // The current addKeyLevel function already handles some deduplication by price and strength.
  // Further ranking logic might be needed if multiple strengths are assigned to the same price.
  // For now, the first strength assigned (higher one due to order of processing) will persist.

  return keyLevels;
}
