
import { ConsumptionData } from '@/utils/mockData';
import { fetchExcelData } from '@/utils/modelLoader';

/**
 * Process data from Excel format to ConsumptionData format
 */
export const processExcelData = async (): Promise<ConsumptionData[]> => {
  try {
    const data = await fetchExcelData();
    
    // Map the data to our ConsumptionData format
    return data.map((item: any) => ({
      date: typeof item.date === 'string' ? item.date : `${item.year}-${String(item.month).padStart(2, '0')}-01`,
      consumption: Number(item.consumption || item.value),
      isPrediction: false
    }));
  } catch (error) {
    console.error('Error processing Excel data:', error);
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
