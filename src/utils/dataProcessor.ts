
import { ConsumptionData } from '@/utils/mockData';
import { fetchExcelData } from '@/utils/modelLoader';
import { toast } from 'sonner';

/**
 * Process data from Excel format to ConsumptionData format
 */
export const processExcelData = async (): Promise<ConsumptionData[]> => {
  try {
    console.log('Starting Excel data processing');
    
    // Implement retries for better reliability
    let retryCount = 0;
    let data: any[] = [];
    
    while (retryCount < 3 && data.length === 0) {
      if (retryCount > 0) {
        console.log(`Retry attempt ${retryCount} for Excel data`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second between retries
      }
      
      data = await fetchExcelData();
      retryCount++;
    }
    
    if (data.length === 0) {
      throw new Error('Failed to fetch Excel data after multiple attempts');
    }
    
    // Map the data to our ConsumptionData format and ensure dates are valid
    const processedData = data.map((item: any) => ({
      date: typeof item.date === 'string' ? item.date : `${item.year}-${String(item.month).padStart(2, '0')}-01`,
      consumption: Number(item.consumption || item.value),
      isPrediction: false
    }));
    
    // Validate data - only include entries with valid dates and consumption values
    const validatedData = processedData.filter(item => {
      const isValidDate = !isNaN(new Date(item.date).getTime());
      const isValidConsumption = !isNaN(item.consumption);
      // Only include data with valid date and consumption values
      return isValidDate && isValidConsumption;
    });
    
    if (validatedData.length === 0) {
      throw new Error('No valid data entries found after validation');
    }
    
    console.log(`Successfully processed ${validatedData.length} Excel data records`);
    return validatedData;
  } catch (error) {
    console.error('Error processing Excel data:', error);
    toast(`Failed to load default data. Please try again later.`);
    return [];
  }
};

/**
 * Generate future dates for predictions
 */
export const generateFutureDates = (
  startDate: Date, 
  numMonths: number
): string[] => {
  const dates: string[] = [];
  const date = new Date(startDate);
  
  for (let i = 0; i < numMonths; i++) {
    date.setMonth(date.getMonth() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    dates.push(`${year}-${month}-01`);
  }
  
  return dates;
};

/**
 * Convert historical data to tensor format for model input
 */
export const prepareModelInput = (
  data: ConsumptionData[],
  lookback: number = 12  // Use 12 months of data by default
): number[][] => {
  if (data.length < lookback) {
    console.error('Not enough data points for model input');
    return [[]];
  }
  
  const normalizedData = normalizeData(data.slice(-lookback));
  
  // Format depends on model architecture, this is a simplified example
  // May need to adjust based on your specific model's expected input shape
  return [normalizedData.map(d => d.consumption)];
};

/**
 * Normalize data for model input
 */
const normalizeData = (data: ConsumptionData[]): ConsumptionData[] => {
  if (data.length === 0) return [];
  
  const values = data.map(d => d.consumption);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  if (range === 0) return data;
  
  return data.map(d => ({
    ...d,
    consumption: (d.consumption - min) / range
  }));
};

/**
 * Denormalize model output back to original scale
 */
export const denormalizeOutput = (
  predictions: number[],
  originalData: ConsumptionData[]
): number[] => {
  if (predictions.length === 0 || originalData.length === 0) return [];
  
  const values = originalData.map(d => d.consumption);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  return predictions.map(p => (p * range) + min);
};

/**
 * Detect data granularity (daily, monthly, yearly) and normalize to monthly format
 * @param data Uploaded consumption data
 */
export const detectAndNormalizeTimeGranularity = (data: ConsumptionData[]): ConsumptionData[] => {
  if (data.length <= 1) return data;
  
  // Sort data chronologically for analysis
  const sortedData = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Calculate time differences between consecutive points
  const timeDiffs: number[] = [];
  for (let i = 1; i < sortedData.length; i++) {
    const curr = new Date(sortedData[i].date);
    const prev = new Date(sortedData[i-1].date);
    
    // Time difference in days
    const diffTime = Math.abs(curr.getTime() - prev.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    timeDiffs.push(diffDays);
  }
  
  // Calculate the median time difference
  const sortedDiffs = [...timeDiffs].sort((a, b) => a - b);
  const medianDiff = sortedDiffs[Math.floor(sortedDiffs.length / 2)];
  
  console.log(`Detected median time difference: ${medianDiff} days`);
  
  // Determine data granularity based on median difference
  let granularity: 'daily' | 'monthly' | 'yearly';
  
  if (medianDiff <= 7) {
    granularity = 'daily';
  } else if (medianDiff <= 45) {
    granularity = 'monthly';
  } else {
    granularity = 'yearly';
  }
  
  console.log(`Detected data granularity: ${granularity}`);
  
  // For daily or yearly data, convert to monthly format
  if (granularity === 'daily') {
    return convertDailyToMonthly(sortedData);
  } else if (granularity === 'yearly') {
    return convertYearlyToMonthly(sortedData);
  }
  
  // For monthly data, ensure consistent month start date
  return sortedData.map(item => {
    const date = new Date(item.date);
    return {
      ...item,
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
    };
  });
};

/**
 * Convert daily data to monthly format
 */
const convertDailyToMonthly = (data: ConsumptionData[]): ConsumptionData[] => {
  const monthlyData = new Map<string, {total: number, count: number, isPrediction: boolean}>();
  
  data.forEach(item => {
    const date = new Date(item.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {total: 0, count: 0, isPrediction: item.isPrediction || false});
    }
    
    const entry = monthlyData.get(monthKey)!;
    entry.total += item.consumption;
    entry.count += 1;
    // If any data point in the month is a prediction, mark the month as a prediction
    entry.isPrediction = entry.isPrediction || (item.isPrediction || false);
  });
  
  return Array.from(monthlyData).map(([month, data]) => ({
    date: `${month}-01`,
    consumption: Math.round(data.total / data.count),
    isPrediction: data.isPrediction
  }));
};

/**
 * Convert yearly data to monthly format using interpolation
 */
const convertYearlyToMonthly = (data: ConsumptionData[]): ConsumptionData[] => {
  const result: ConsumptionData[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const currentYear = new Date(data[i].date).getFullYear();
    const currentValue = data[i].consumption;
    const isPrediction = data[i].isPrediction || false;
    
    // If we have next year's data, use it for interpolation
    let nextYearValue = currentValue;
    if (i < data.length - 1) {
      const nextYear = new Date(data[i+1].date).getFullYear();
      if (nextYear > currentYear) {
        nextYearValue = data[i+1].consumption;
      }
    }
    
    // Create monthly entries using linear interpolation
    for (let month = 1; month <= 12; month++) {
      let monthlyValue;
      
      // Simple seasonal pattern: higher in winter, lower in summer (Northern Hemisphere)
      const seasonalFactor = 1 + 0.2 * Math.sin((month - 1) / 12 * 2 * Math.PI);
      
      if (i < data.length - 1) {
        const interpolationFactor = (month - 1) / 12;
        monthlyValue = currentValue * (1 - interpolationFactor) + nextYearValue * interpolationFactor;
        monthlyValue *= seasonalFactor;
      } else {
        monthlyValue = currentValue * seasonalFactor;
      }
      
      result.push({
        date: `${currentYear}-${String(month).padStart(2, '0')}-01`,
        consumption: Math.round(monthlyValue),
        isPrediction: isPrediction
      });
    }
  }
  
  return result;
};

/**
 * Generate predictions from uploaded data using the selected model
 */
export const generatePredictionsFromUploadedData = async (
  uploadedData: ConsumptionData[],
  modelName: string,
  predictionMonths: number = 72
): Promise<ConsumptionData[]> => {
  try {
    console.log(`Generating predictions using ${modelName} model for uploaded data`);
    
    // Validate the uploaded data
    if (!Array.isArray(uploadedData) || uploadedData.length === 0) {
      throw new Error('No valid data provided for predictions');
    }
    
    // Validate and clean the uploaded data
    const validData = uploadedData.filter(item => {
      const isValidDate = !isNaN(new Date(item.date).getTime());
      const isValidConsumption = !isNaN(item.consumption) && item.consumption > 0;
      return isValidDate && isValidConsumption;
    });
    
    if (validData.length === 0) {
      throw new Error('No valid data entries found after validation');
    }
    
    // Detect and normalize time granularity to ensure monthly data
    const normalizedData = detectAndNormalizeTimeGranularity(validData);
    
    // Sort data chronologically
    const sortedData = [...normalizedData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Use the existing prediction function from mockData for now
    // In a real implementation, this would use the actual TensorFlow model
    const { generatePredictions } = await import('@/utils/mockData');
    
    const predictions = generatePredictions(
      sortedData,
      predictionMonths,
      modelName
    );
    
    console.log(`Generated ${predictions.length} predictions using ${modelName}`);
    return [...sortedData, ...predictions];
  } catch (error) {
    console.error('Error generating predictions from uploaded data:', error);
    toast(`Failed to generate predictions with ${modelName}: ${error instanceof Error ? error.message : String(error)}`);
    return uploadedData;
  }
};
