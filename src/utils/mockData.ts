
// Mock electricity consumption data (2012-2025) and predictions (2026-2031)
export interface ConsumptionData {
  date: string;
  consumption: number;
  isPrediction?: boolean;
}

export interface ModelPerformance {
  model: string;
  mae: number;
  mse: number;
  r2: number;
}

// Generate mock data for electricity consumption
export const generateMockData = (): ConsumptionData[] => {
  const data: ConsumptionData[] = [];
  
  // Historical data (2012-2025)
  for (let year = 2012; year <= 2025; year++) {
    for (let month = 1; month <= 12; month++) {
      // Base consumption with seasonal pattern
      let consumption = 5000 + Math.sin((month / 12) * Math.PI * 2) * 2000;
      
      // Add yearly growth trend
      consumption *= (1 + (year - 2012) * 0.05);
      
      // Add some random variation
      consumption += (Math.random() - 0.5) * 1000;
      
      data.push({
        date: `${year}-${month.toString().padStart(2, '0')}-01`,
        consumption: Math.round(consumption),
        isPrediction: false
      });
    }
  }
  
  // Prediction data (2026-2031)
  for (let year = 2026; year <= 2031; year++) {
    for (let month = 1; month <= 12; month++) {
      // Base consumption with seasonal pattern
      let consumption = 5000 + Math.sin((month / 12) * Math.PI * 2) * 2000;
      
      // Add yearly growth trend
      consumption *= (1 + (year - 2012) * 0.05);
      
      // Add more randomness for predictions
      consumption += (Math.random() - 0.5) * 2000;
      
      data.push({
        date: `${year}-${month.toString().padStart(2, '0')}-01`,
        consumption: Math.round(consumption),
        isPrediction: true
      });
    }
  }
  
  return data;
};

// Generate mock model performance metrics
export const getModelPerformance = (model: string): ModelPerformance => {
  const performances: Record<string, ModelPerformance> = {
    'GRU': {
      model: 'GRU',
      mae: 234.5,
      mse: 82451.3,
      r2: 0.86
    },
    'Bidirectional LSTM': {
      model: 'Bidirectional LSTM',
      mae: 189.2,
      mse: 68742.1,
      r2: 0.91
    },
    'NBEATS': {
      model: 'NBEATS',
      mae: 205.7,
      mse: 71523.4,
      r2: 0.89
    }
  };
  
  return performances[model] || performances['GRU'];
};

// Generate yearly summary statistics
export const generateYearlySummary = (data: ConsumptionData[]) => {
  const yearlySummary: Record<string, {
    totalConsumption: number;
    yearOverYearChange: number;
    highestMonth: { month: string; consumption: number };
    lowestMonth: { month: string; consumption: number };
  }> = {};
  
  // Group by year
  const years = [...new Set(data.map(item => item.date.substring(0, 4)))];
  
  for (const year of years) {
    const yearData = data.filter(item => item.date.startsWith(year));
    const previousYear = (parseInt(year) - 1).toString();
    const previousYearData = data.filter(item => item.date.startsWith(previousYear));
    
    const totalConsumption = yearData.reduce((sum, item) => sum + item.consumption, 0);
    let yearOverYearChange = 0;
    
    if (previousYearData.length > 0) {
      const previousYearTotal = previousYearData.reduce((sum, item) => sum + item.consumption, 0);
      yearOverYearChange = ((totalConsumption - previousYearTotal) / previousYearTotal) * 100;
    }
    
    // Find highest and lowest months
    const sortedMonths = [...yearData].sort((a, b) => b.consumption - a.consumption);
    const highestMonth = sortedMonths[0];
    const lowestMonth = sortedMonths[sortedMonths.length - 1];
    
    yearlySummary[year] = {
      totalConsumption,
      yearOverYearChange,
      highestMonth: {
        month: new Date(highestMonth.date).toLocaleString('default', { month: 'long' }),
        consumption: highestMonth.consumption
      },
      lowestMonth: {
        month: new Date(lowestMonth.date).toLocaleString('default', { month: 'long' }),
        consumption: lowestMonth.consumption
      }
    };
  }
  
  return yearlySummary;
};
