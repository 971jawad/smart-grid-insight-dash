import React, { useState } from 'react';
import { ConsumptionData } from '@/utils/mockData';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/authProvider';
import { Loader2, AlertCircle, FileCheck, Ban, ShieldCheck, FileWarning } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GoogleDriveUploader from '@/components/GoogleDriveUploader';
import FileUploadZone from '@/components/FileUploadZone';
import FileStatusIndicator from '@/components/FileStatusIndicator';
import { processCSV, interpolateMissingMonths } from '@/utils/fileProcessing';
import { uploadToSupabase, scanFile } from '@/utils/supabaseStorage';
import AuthDialog from '@/components/AuthDialog';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  generatePredictionsFromUploadedData, 
  detectAndNormalizeTimeGranularity 
} from '@/utils/dataProcessor';

interface EnhancedFileUploaderProps {
  onDataUploaded: (data: ConsumptionData[]) => void;
  selectedModel: string;
}

type ScanStatus = 'pending' | 'scanning' | 'passed' | 'failed';
type ValidationStatus = 'pending' | 'validating' | 'valid' | 'invalid';

const EnhancedFileUploader: React.FC<EnhancedFileUploaderProps> = ({ onDataUploaded, selectedModel }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('pending');
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [validationReport, setValidationReport] = useState<string[]>([]);
  const { user } = useAuth();

  // Check if file type is valid (CSV or Excel)
  const isValidFileType = (file: File): boolean => {
    const acceptedTypes = [
      'text/csv', 
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    return acceptedTypes.includes(file.type) || 
           ['csv', 'xls', 'xlsx'].includes(fileExtension || '');
  };

  const handleFileSelect = (file: File) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    
    if (!isValidFileType(file)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV or Excel file",
        variant: "destructive"
      });
      setError('Only CSV or Excel files are accepted');
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    setScanStatus('pending');
    setValidationStatus('pending');
    setValidationReport([]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFileSelect(file);
  };

  const handleGoogleDriveFile = (file: File) => {
    handleFileSelect(file);
  };

  // Validate data for common issues
  const validateData = (data: ConsumptionData[]): { isValid: boolean, report: string[] } => {
    const report: string[] = [];
    let isValid = true;
    
    // Check if data is empty
    if (data.length === 0) {
      report.push("❌ No data found in file");
      return { isValid: false, report };
    }
    
    // Check date format and values
    const invalidDates = data.filter(item => isNaN(new Date(item.date).getTime())).length;
    if (invalidDates > 0) {
      report.push(`❌ Found ${invalidDates} invalid date(s)`);
      isValid = false;
    } else {
      report.push("✓ All dates are valid");
    }
    
    // Check for negative or NaN consumption values
    const invalidConsumption = data.filter(item => 
      isNaN(item.consumption) || item.consumption < 0
    ).length;
    
    if (invalidConsumption > 0) {
      report.push(`❌ Found ${invalidConsumption} invalid consumption value(s)`);
      isValid = false;
    } else {
      report.push("✓ All consumption values are valid");
    }
    
    // Check for duplicated dates
    const dateMap = new Map<string, number>();
    data.forEach(item => {
      const dateCount = dateMap.get(item.date) || 0;
      dateMap.set(item.date, dateCount + 1);
    });
    
    const duplicatedDates = Array.from(dateMap.entries())
      .filter(([_, count]) => count > 1)
      .length;
    
    if (duplicatedDates > 0) {
      report.push(`⚠️ Found ${duplicatedDates} duplicated date(s)`);
    } else {
      report.push("✓ No duplicated dates");
    }
    
    // Check for time series continuity (gaps)
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Detect time granularity based on data
    const timeDiffs: number[] = [];
    for (let i = 1; i < Math.min(10, sortedData.length); i++) {
      const curr = new Date(sortedData[i].date);
      const prev = new Date(sortedData[i-1].date);
      
      // Time difference in days
      const diffTime = Math.abs(curr.getTime() - prev.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      timeDiffs.push(diffDays);
    }
    
    // Calculate median time difference
    const sortedDiffs = [...timeDiffs].sort((a, b) => a - b);
    const medianDiff = sortedDiffs[Math.floor(sortedDiffs.length / 2)] || 0;
    
    // Determine granularity
    let granularity = "unknown";
    if (medianDiff <= 7) {
      granularity = "daily";
    } else if (medianDiff <= 45) {
      granularity = "monthly";
    } else {
      granularity = "yearly";
    }
    
    report.push(`ℹ️ Detected ${granularity} data granularity`);
    
    // Now check for gaps based on the granularity
    let gapCount = 0;
    let significantGapSize = medianDiff * 2; // A gap is significant if it's twice the median difference
    
    for (let i = 1; i < sortedData.length; i++) {
      const prevDate = new Date(sortedData[i-1].date);
      const currDate = new Date(sortedData[i].date);
      
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > significantGapSize) {
        gapCount++;
      }
    }
    
    if (gapCount > 0) {
      report.push(`⚠️ Found ${gapCount} significant gap(s) in time series data`);
    } else {
      report.push("✓ Time series appears continuous");
    }
    
    return { isValid, report };
  };

  const processSelectedFile = async () => {
    if (!selectedFile || !user) {
      setError('No file selected or user not logged in');
      return;
    }
    
    if (!isValidFileType(selectedFile)) {
      setError('Only CSV or Excel files are accepted');
      toast({
        title: "Invalid File Type",
        description: "Only CSV or Excel files are accepted",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const fileId = await uploadToSupabase(selectedFile, user.id);
      
      if (!fileId) {
        throw new Error('Failed to upload file');
      }
      
      // Security scanning
      setScanStatus('scanning');
      const scanPassed = await scanFile(fileId);
      
      if (!scanPassed) {
        setScanStatus('failed');
        setError('File failed security scan. It may contain malicious content.');
        toast({
          title: "Security Scan Failed",
          description: "File was rejected due to security concerns",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }
      
      setScanStatus('passed');
      
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          let parsedData = processCSV(text);
          
          if (parsedData.length === 0) {
            setError('No valid data found in the file');
            toast({
              title: "Empty Data",
              description: "No valid data found in the file",
              variant: "destructive"
            });
            setIsUploading(false);
            return;
          }
          
          // Validate data
          setValidationStatus('validating');
          const { isValid, report } = validateData(parsedData);
          setValidationReport(report);
          
          if (!isValid) {
            setValidationStatus('invalid');
            setError('Data validation failed. See the validation report for details.');
            toast({
              title: "Validation Failed",
              description: "Data validation failed. Some data may be incorrect.",
              variant: "destructive"
            });
            setIsUploading(false);
            return;
          }
          
          setValidationStatus('valid');
          
          // Handle different time granularities (daily, monthly, yearly)
          parsedData = detectAndNormalizeTimeGranularity(parsedData);
          
          // Interpolate missing months and sort chronologically
          parsedData = interpolateMissingMonths(parsedData);
          parsedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          toast({
            title: "Data Processed Successfully",
            description: `Successfully processed data with ${parsedData.length} entries`,
            variant: "default"
          });
          
          // Generate predictions if a model is selected
          if (selectedModel && selectedModel !== 'none') {
            toast({
              title: "Generating Predictions",
              description: `Using ${selectedModel} model to generate predictions...`,
              variant: "default"
            });
            const dataWithPredictions = await generatePredictionsFromUploadedData(
              parsedData, 
              selectedModel
            );
            onDataUploaded(dataWithPredictions);
          } else {
            onDataUploaded(parsedData);
          }
          
          setSelectedFile(null);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setError(`Error processing file: ${errorMessage}`);
          toast({
            title: "Processing Error",
            description: `Error processing file: ${errorMessage}`,
            variant: "destructive"
          });
          setValidationStatus('invalid');
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        setError('Error reading file');
        toast({
          title: "File Read Error",
          description: "Could not read the uploaded file",
          variant: "destructive"
        });
        setIsUploading(false);
        setScanStatus('pending');
      };
      
      reader.readAsText(selectedFile);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Error: ${errorMessage}`);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      setIsUploading(false);
      setScanStatus('pending');
    }
  };

  return (
    <Card className="border border-border/40">
      <CardHeader>
        <CardTitle>Upload Your Data</CardTitle>
        <CardDescription>
          Upload a CSV or Excel file with electricity consumption data. The file should have date and consumption (kWh) columns.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <Alert variant="default" className="bg-accent/30 border-accent/50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>File Requirements</AlertTitle>
            <AlertDescription className="text-sm">
              Only CSV and Excel files are accepted. Files must include date/time and consumption columns.
            </AlertDescription>
          </Alert>
          
          <FileUploadZone 
            onFileUpload={handleFileUpload}
            isUploading={isUploading}
          />
          
          <GoogleDriveUploader onFileSelected={handleGoogleDriveFile} />
          
          {selectedFile && !isUploading && (
            <div className="mt-4 p-4 border border-border/40 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="h-5 w-5 text-primary" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-muted-foreground text-xs">
                  ({Math.round(selectedFile.size / 1024)} KB)
                </span>
              </div>
              
              {scanStatus === 'pending' && (
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm">Ready to process</span>
                  <button 
                    className="px-4 py-1 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
                    onClick={processSelectedFile}
                  >
                    Process File
                  </button>
                </div>
              )}
              
              {scanStatus === 'scanning' && (
                <div className="mt-3 flex items-center space-x-2 text-amber-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Scanning file for security threats...</span>
                </div>
              )}
              
              {scanStatus === 'passed' && (
                <div className="mt-3 flex items-center space-x-2 text-green-500">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-sm">Security scan passed</span>
                </div>
              )}
              
              {scanStatus === 'failed' && (
                <div className="mt-3 flex items-center space-x-2 text-red-500">
                  <Ban className="h-4 w-4" />
                  <span className="text-sm">Security scan failed - file rejected</span>
                </div>
              )}
              
              {validationStatus === 'validating' && (
                <div className="mt-3 flex items-center space-x-2 text-amber-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Validating data quality...</span>
                </div>
              )}
              
              {validationStatus === 'valid' && (
                <div className="mt-3 flex items-center space-x-2 text-green-500">
                  <FileCheck className="h-4 w-4" />
                  <span className="text-sm">Data validation passed</span>
                </div>
              )}
              
              {validationStatus === 'invalid' && (
                <div className="mt-3 space-y-2 text-red-500">
                  <div className="flex items-center space-x-2">
                    <FileWarning className="h-4 w-4" />
                    <span className="text-sm">Data validation issues detected</span>
                  </div>
                  
                  {validationReport.length > 0 && (
                    <div className="bg-background/50 p-2 rounded border border-border/50 mt-2 text-sm">
                      <p className="font-medium mb-1">Validation Report:</p>
                      <ul className="list-none space-y-1 pl-2">
                        {validationReport.map((item, index) => (
                          <li key={index} className={`${
                            item.startsWith('✓') 
                              ? 'text-green-500' 
                              : item.startsWith('⚠️') 
                                ? 'text-amber-500' 
                                : 'text-red-500'
                          }`}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {isUploading && (
            <div className="mt-3 flex items-center space-x-2 text-blue-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing file...</span>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive" className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </Card>
  );
};

export default EnhancedFileUploader;
