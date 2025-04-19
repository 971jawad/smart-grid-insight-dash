
import React, { useState } from 'react';
import { ConsumptionData } from '@/utils/mockData';
import { toast } from "sonner";

interface FileUploaderProps {
  onDataUploaded: (data: ConsumptionData[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onDataUploaded }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for missing months and interpolate data
  const interpolateMissingMonths = (data: ConsumptionData[]): ConsumptionData[] => {
    if (data.length <= 1) return data;
    
    // Sort data by date
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const result: ConsumptionData[] = [];
    const startDate = new Date(sortedData[0].date);
    const endDate = new Date(sortedData[sortedData.length - 1].date);
    
    // Create a map of existing dates for fast lookup
    const existingDates = new Map<string, ConsumptionData>();
    sortedData.forEach(item => {
      existingDates.set(item.date, item);
    });
    
    // Generate all months between start and end dates
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const formattedDate = `${year}-${month}-01`;
      
      if (existingDates.has(formattedDate)) {
        result.push(existingDates.get(formattedDate)!);
      } else {
        // Interpolate missing month
        const prevDate = new Date(currentDate);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
        
        const prevYear = prevDate.getFullYear();
        const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
        const prevFormattedDate = `${prevYear}-${prevMonth}-01`;
        
        const nextYear = nextDate.getFullYear();
        const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
        const nextFormattedDate = `${nextYear}-${nextMonth}-01`;
        
        let interpolatedValue = 0;
        let valuesFound = 0;
        
        // Find the closest previous value
        for (let i = sortedData.length - 1; i >= 0; i--) {
          if (new Date(sortedData[i].date) < currentDate) {
            interpolatedValue += sortedData[i].consumption;
            valuesFound++;
            break;
          }
        }
        
        // Find the closest next value
        for (let i = 0; i < sortedData.length; i++) {
          if (new Date(sortedData[i].date) > currentDate) {
            interpolatedValue += sortedData[i].consumption;
            valuesFound++;
            break;
          }
        }
        
        // Calculate average or use the only value found
        interpolatedValue = valuesFound > 0 ? interpolatedValue / valuesFound : 0;
        
        result.push({
          date: formattedDate,
          consumption: Math.round(interpolatedValue),
          isPrediction: false,
          isInterpolated: true
        });
      }
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return result;
  };

  const processCSV = (csvText: string): ConsumptionData[] => {
    try {
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      
      // Find the indices of date and consumption columns
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
        
        // Skip if not enough values
        if (values.length <= Math.max(dateIndex, consumptionIndex)) continue;
        
        // Try to parse the date
        let dateStr = values[dateIndex].trim();
        let dateObj: Date;
        
        try {
          dateObj = new Date(dateStr);
          if (isNaN(dateObj.getTime())) throw new Error('Invalid date');
        } catch (e) {
          console.error(`Error parsing date on line ${i + 1}: ${dateStr}`);
          continue;
        }
        
        // Try to parse the consumption value
        const consumptionStr = values[consumptionIndex].trim();
        const consumption = parseFloat(consumptionStr);
        
        if (isNaN(consumption)) {
          console.error(`Error parsing consumption on line ${i + 1}: ${consumptionStr}`);
          continue;
        }
        
        // Format date as YYYY-MM-DD
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-01`;
        
        result.push({
          date: formattedDate,
          consumption: consumption,
          isPrediction: false
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error processing CSV:', error);
      throw error;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if it's a CSV file
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV files are accepted');
      toast.error('Only CSV files are accepted');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let parsedData = processCSV(text);
        
        if (parsedData.length === 0) {
          setError('No valid data found in the file');
          toast.error('No valid data found in the file');
        } else {
          // Interpolate missing months
          parsedData = interpolateMissingMonths(parsedData);
          
          // Sort data by date
          parsedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          toast.success(`Successfully processed data with ${parsedData.length} entries`);
          onDataUploaded(parsedData);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError(`Error processing file: ${errorMessage}`);
        toast.error(`Error processing file: ${errorMessage}`);
      } finally {
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Error reading file');
      toast.error('Error reading file');
      setIsUploading(false);
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-2">Upload Your Data</h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload a CSV file with electricity consumption data. The file should have date and consumption (kWh) columns.
      </p>
      
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">CSV file only</p>
          </div>
          <input 
            id="file-upload" 
            type="file" 
            accept=".csv" 
            className="hidden" 
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>
      </div>
      
      {isUploading && (
        <div className="mt-3 text-sm text-blue-600">
          Processing file...
        </div>
      )}
      
      {error && (
        <div className="mt-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
