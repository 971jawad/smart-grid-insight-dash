
import React, { useState } from 'react';
import { ConsumptionData } from '@/utils/mockData';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authProvider';
import { Button } from '@/components/ui/button';
import { Loader2, FileCheck, FileWarning, Upload, Clock } from 'lucide-react';
import GoogleDriveUploader from '@/components/GoogleDriveUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EnhancedFileUploaderProps {
  onDataUploaded: (data: ConsumptionData[]) => void;
}

type ScanStatus = 'pending' | 'scanning' | 'passed' | 'failed';

const EnhancedFileUploader: React.FC<EnhancedFileUploaderProps> = ({ onDataUploaded }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user } = useAuth();

  // Check for missing months and interpolate data (reused from original FileUploader)
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

  const uploadToSupabase = async (file: File): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to upload files');
      return null;
    }

    try {
      // Create a folder structure with user ID
      const folderPath = `${user.id}/${new Date().getTime()}_${file.name}`;
      
      // Upload the file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('csv_files')
        .upload(folderPath, file, {
          contentType: file.type || 'text/csv',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Save file metadata to database
      const { data: fileData, error: fileError } = await supabase
        .from('csv_files')
        .insert([
          {
            user_id: user.id,
            filename: uploadData.path.split('/').pop(),
            original_name: file.name,
            size: file.size,
            mime_type: file.type || 'text/csv',
            source: 'upload',
            storage_path: uploadData.path,
          },
        ])
        .select('id')
        .single();

      if (fileError) {
        throw new Error(fileError.message);
      }

      return fileData.id;
    } catch (error) {
      console.error('Error uploading to Supabase:', error);
      throw error;
    }
  };

  const scanFile = async (fileId: string): Promise<boolean> => {
    try {
      setScanStatus('scanning');
      
      // Call our security scan function
      const { data, error } = await supabase.functions.invoke('scan-file', {
        body: { fileId, bucketId: 'csv_files' },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        setScanStatus('failed');
        setError(data.message);
        return false;
      }

      setScanStatus('passed');
      return true;
    } catch (error) {
      console.error('Error scanning file:', error);
      setScanStatus('failed');
      setError('Failed to scan file for security threats');
      return false;
    }
  };

  const handleFileSelect = (file: File) => {
    // Reset states
    setSelectedFile(file);
    setError(null);
    setScanStatus('pending');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFileSelect(file);
  };

  const handleGoogleDriveFile = (file: File) => {
    handleFileSelect(file);
  };

  const processSelectedFile = async () => {
    if (!selectedFile) {
      setError('No file selected');
      return;
    }
    
    // Check if it's a CSV file
    if (!selectedFile.name.toLowerCase().endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setError('Only CSV files are accepted');
      toast.error('Only CSV files are accepted');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      // Upload to Supabase
      const fileId = await uploadToSupabase(selectedFile);
      
      if (!fileId) {
        throw new Error('Failed to upload file');
      }
      
      // Scan the file for security threats
      const scanPassed = await scanFile(fileId);
      
      if (!scanPassed) {
        return;
      }
      
      // Process the file
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
            setSelectedFile(null);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setError(`Error processing file: ${errorMessage}`);
          toast.error(`Error processing file: ${errorMessage}`);
        } finally {
          setIsUploading(false);
          setScanStatus('pending');
        }
      };
      
      reader.onerror = () => {
        setError('Error reading file');
        toast.error('Error reading file');
        setIsUploading(false);
        setScanStatus('pending');
      };
      
      reader.readAsText(selectedFile);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Error: ${errorMessage}`);
      toast.error(`Error: ${errorMessage}`);
      setIsUploading(false);
      setScanStatus('pending');
    }
  };

  const getScanStatusIcon = () => {
    switch (scanStatus) {
      case 'scanning':
        return <Loader2 className="h-5 w-5 animate-spin text-amber-500" />;
      case 'passed':
        return <FileCheck className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <FileWarning className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getScanStatusText = () => {
    switch (scanStatus) {
      case 'scanning':
        return 'Scanning file for threats...';
      case 'passed':
        return 'File passed security checks';
      case 'failed':
        return 'Security scan failed';
      default:
        return 'Ready to scan';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Your Data</CardTitle>
        <CardDescription>
          Upload a CSV file with electricity consumption data. The file should have date and consumption (kWh) columns.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {!user ? (
            <div className="text-center py-4">
              <p>Please sign in to upload files</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-accent/50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">CSV file only</p>
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
              
              <GoogleDriveUploader onFileSelected={handleGoogleDriveFile} />
              
              {selectedFile && !isUploading && (
                <div className="mt-4 p-3 border rounded-md bg-accent/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileCheck className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(selectedFile.size / 1024)} KB
                    </span>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getScanStatusIcon()}
                      <span className="text-sm text-muted-foreground">{getScanStatusText()}</span>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={processSelectedFile}
                      disabled={isUploading || !selectedFile}
                    >
                      Process File
                    </Button>
                  </div>
                </div>
              )}
              
              {isUploading && (
                <div className="mt-3 flex items-center space-x-2 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing file...</span>
                </div>
              )}
              
              {error && (
                <div className="mt-3 text-sm text-red-600">
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedFileUploader;
