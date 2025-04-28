
import { ConsumptionData } from '@/utils/mockData';

export const interpolateMissingMonths = (data: ConsumptionData[]): ConsumptionData[] => {
  if (data.length <= 1) return data;
  
  const sortedData = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const result: ConsumptionData[] = [];
  const startDate = new Date(sortedData[0].date);
  const endDate = new Date(sortedData[sortedData.length - 1].date);
  
  const existingDates = new Map<string, ConsumptionData>();
  sortedData.forEach(item => {
    existingDates.set(item.date, item);
  });
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const formattedDate = `${year}-${month}-01`;
    
    if (existingDates.has(formattedDate)) {
      result.push(existingDates.get(formattedDate)!);
    } else {
      let interpolatedValue = 0;
      let valuesFound = 0;
      
      for (let i = sortedData.length - 1; i >= 0; i--) {
        if (new Date(sortedData[i].date) < currentDate) {
          interpolatedValue += sortedData[i].consumption;
          valuesFound++;
          break;
        }
      }
      
      for (let i = 0; i < sortedData.length; i++) {
        if (new Date(sortedData[i].date) > currentDate) {
          interpolatedValue += sortedData[i].consumption;
          valuesFound++;
          break;
        }
      }
      
      interpolatedValue = valuesFound > 0 ? interpolatedValue / valuesFound : 0;
      
      result.push({
        date: formattedDate,
        consumption: Math.round(interpolatedValue),
        isPrediction: false,
        isInterpolated: true
      });
    }
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return result;
};

export const processCSV = (csvText: string): ConsumptionData[] => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  
  const dateIndex = headers.findIndex(h => 
    h.toLowerCase().includes('date') || h.toLowerCase().includes('time')
  );
  
  const consumptionIndex = headers.findIndex(h => 
    h.toLowerCase().includes('consumption') || 
    h.toLowerCase().includes('kwh') || 
    h.toLowerCase().includes('usage')
  );
  
  if (dateIndex === -1 || consumptionIndex === -1) {
    throw new Error('CSV must have date and consumption columns');
  }
  
  const result: ConsumptionData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    
    if (values.length <= Math.max(dateIndex, consumptionIndex)) continue;
    
    let dateStr = values[dateIndex].trim();
    let dateObj: Date;
    
    try {
      dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) throw new Error('Invalid date');
    } catch (e) {
      console.error(`Error parsing date on line ${i + 1}: ${dateStr}`);
      continue;
    }
    
    const consumptionStr = values[consumptionIndex].trim();
    const consumption = parseFloat(consumptionStr);
    
    if (isNaN(consumption)) {
      console.error(`Error parsing consumption on line ${i + 1}: ${consumptionStr}`);
      continue;
    }
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const formattedDate = `${year}-${month}-01`;
    
    result.push({
      date: formattedDate,
      consumption: consumption,
      isPrediction: false
    });
  }
  
  return result;
};
