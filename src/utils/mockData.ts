
// Mock electricity consumption data (2012-2025) and predictions (2026-2031)
export interface ConsumptionData {
  date: string;
  consumption: number;
  isPrediction?: boolean;
  isInterpolated?: boolean;
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
  
  // Generate predictions based on historical data
  const predictions = generatePredictions(data, 72, 'GRU'); // 6 years (72 months) of predictions
  
  return [...data, ...predictions];
};

// Generate predictions based on historical data and selected model
export const generatePredictions = (
  historicalData: ConsumptionData[], 
  numMonths: number, 
  model: string
): ConsumptionData[] => {
  if (historicalData.length === 0) return [];

  // Sort historical data by date
  const sortedData = [...historicalData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Get the last date from historical data
  const lastEntry = sortedData[sortedData.length - 1];
  const lastDate = new Date(lastEntry.date);
  
  // Model characteristics influence how predictions are generated
  // Default values if model isn't found
  let seasonalStrength = 0.7;
  let trendStrength = 0.8;
  let noiseReduction = 0.6;
  
  // Import model characteristics from component
  try {
    const { MODEL_CHARACTERISTICS } = require('@/components/ModelSelector');
    if (MODEL_CHARACTERISTICS && MODEL_CHARACTERISTICS[model]) {
      seasonalStrength = MODEL_CHARACTERISTICS[model].seasonalStrength;
      trendStrength = MODEL_CHARACTERISTICS[model].trendStrength;
      noiseReduction = MODEL_CHARACTERISTICS[model].noiseReduction;
    }
  } catch (e) {
    console.error('Error loading model characteristics:', e);
  }
  
  // Calculate trend
  let totalGrowth = 0;
  
  if (sortedData.length > 12) {
    const yearAgoIndex = Math.max(0, sortedData.length - 13);
    const yearAgoValue = sortedData[yearAgoIndex].consumption;
    const currentValue = lastEntry.consumption;
    totalGrowth = (currentValue - yearAgoValue) / yearAgoValue;
  } else if (sortedData.length > 1) {
    const firstValue = sortedData[0].consumption;
    const lastValue = lastEntry.consumption;
    const monthsElapsed = sortedData.length - 1;
    totalGrowth = ((lastValue / firstValue) ** (1 / monthsElapsed) - 1) * 12; // Annualized growth
  }
  
  // Ensure reasonable growth rate
  const annualGrowthRate = Math.max(-0.2, Math.min(0.3, totalGrowth)) * trendStrength;
  
  // Extract seasonal pattern
  const seasonalPattern: number[] = [];
  if (sortedData.length >= 12) {
    // Use the last 1-3 years to determine seasonality
    const yearsToUse = Math.min(3, Math.floor(sortedData.length / 12));
    const startIndex = sortedData.length - (yearsToUse * 12);
    
    // Calculate average value per month
    const monthlyAverages = Array(12).fill(0);
    const monthCounts = Array(12).fill(0);
    
    for (let i = startIndex; i < sortedData.length; i++) {
      const date = new Date(sortedData[i].date);
      const monthIndex = date.getMonth();
      monthlyAverages[monthIndex] += sortedData[i].consumption;
      monthCounts[monthIndex]++;
    }
    
    // Calculate actual averages
    for (let i = 0; i < 12; i++) {
      if (monthCounts[i] > 0) {
        monthlyAverages[i] /= monthCounts[i];
      }
    }
    
    // Calculate overall average
    const overallAverage = monthlyAverages.reduce((sum, val) => sum + val, 0) / 12;
    
    // Calculate seasonal factors
    for (let i = 0; i < 12; i++) {
      seasonalPattern[i] = monthlyAverages[i] / overallAverage;
    }
  } else {
    // Not enough data for reliable seasonality, use generic seasonal pattern
    for (let i = 0; i < 12; i++) {
      seasonalPattern[i] = 1 + 0.2 * Math.sin((i / 12) * Math.PI * 2);
    }
  }
  
  // Generate predictions
  const predictions: ConsumptionData[] = [];
  let nextDate = new Date(lastDate);
  nextDate.setMonth(nextDate.getMonth() + 1);
  
  let baseValue = lastEntry.consumption;
  
  for (let i = 0; i < numMonths; i++) {
    const year = nextDate.getFullYear();
    const month = nextDate.getMonth() + 1;
    const monthStr = month.toString().padStart(2, '0');
    
    // Apply growth trend
    const monthsElapsed = i + 1;
    const growthFactor = (1 + (annualGrowthRate / 12)) ** monthsElapsed;
    
    // Apply seasonality
    const seasonalFactor = 1 + (seasonalPattern[month - 1] - 1) * seasonalStrength;
    
    // Calculate predicted value
    let predictedValue = baseValue * growthFactor * seasonalFactor;
    
    // Add randomness based on noise reduction factor (higher reduction = less noise)
    const noiseScale = 0.05 * (1 - noiseReduction);
    const noise = (Math.random() * 2 - 1) * noiseScale * predictedValue;
    predictedValue += noise;
    
    // Add to predictions
    predictions.push({
      date: `${year}-${monthStr}-01`,
      consumption: Math.round(predictedValue),
      isPrediction: true
    });
    
    // Move to next month
    nextDate.setMonth(nextDate.getMonth() + 1);
  }
  
  return predictions;
};

// Generate mock model performance metrics
export const getModelPerformance = (model: string): ModelPerformance => {
  const performances: Record<string, ModelPerformance> = {
    'GRU': {
      model: 'GRU',
      mae: 0.08247126781120773,
      mse: 0.00986050934169316,
      r2: 0.8653740589636583
    },
    'Bidirectional LSTM': {
      model: 'Bidirectional LSTM',
      mae: 0.06898624264029979,
      mse: 0.007775012006380435,
      r2: 0.8938474401619412
    },
    'DeepAR': {
      model: 'DeepAR',
      mae: 0.07626980876023641,
      mse: 0.010184665602040177,
      r2: 0.8508961090804059
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
