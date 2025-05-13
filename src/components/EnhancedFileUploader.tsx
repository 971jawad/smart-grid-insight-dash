
import React, { useState } from 'react';
import { ConsumptionData } from '@/utils/mockData';
import { toast } from 'sonner';
import { useAuth } from '@/lib/authProvider';
import { Loader2, AlertCircle, FileCheck, Ban } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GoogleDriveUploader from '@/components/GoogleDriveUploader';
import FileUploadZone from '@/components/FileUploadZone';
import FileStatusIndicator from '@/components/FileStatusIndicator';
import { processCSV, interpolateMissingMonths } from '@/utils/fileProcessing';
import { uploadToSupabase, scanFile } from '@/utils/supabaseStorage';
import AuthDialog from '@/components/AuthDialog';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { generatePredictionsFromUploadedData } from '@/utils/dataProcessor';

interface EnhancedFileUploaderProps {
  onDataUploaded: (data: ConsumptionData[]) => void;
  selectedModel: string;
}

type ScanStatus = 'pending' | 'scanning' | 'passed' | 'failed';

const EnhancedFileUploader: React.FC<EnhancedFileUploaderProps> = ({ onDataUploaded, selectedModel }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
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
      toast.error('Please select a CSV or Excel file');
      setError('Only CSV or Excel files are accepted');
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    setScanStatus('pending');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFileSelect(file);
  };

  const handleGoogleDriveFile = (file: File) => {
    handleFileSelect(file);
  };

  const processSelectedFile = async () => {
    if (!selectedFile || !user) {
      setError('No file selected or user not logged in');
      return;
    }
    
    if (!isValidFileType(selectedFile)) {
      setError('Only CSV or Excel files are accepted');
      toast.error('Only CSV or Excel files are accepted');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const fileId = await uploadToSupabase(selectedFile, user.id);
      
      if (!fileId) {
        throw new Error('Failed to upload file');
      }
      
      setScanStatus('scanning');
      const scanPassed = await scanFile(fileId);
      
      if (!scanPassed) {
        setScanStatus('failed');
        setError('File failed security scan. It may contain malicious content.');
        toast.error('File failed security scan');
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
            toast.error('No valid data found in the file');
          } else {
            parsedData = interpolateMissingMonths(parsedData);
            parsedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            toast.success(`Successfully processed data with ${parsedData.length} entries`);
            
            // Generate predictions if a model is selected
            if (selectedModel && selectedModel !== 'none') {
              toast.info(`Generating predictions using ${selectedModel} model...`);
              const dataWithPredictions = await generatePredictionsFromUploadedData(
                parsedData, 
                selectedModel
              );
              onDataUploaded(dataWithPredictions);
            } else {
              onDataUploaded(parsedData);
            }
            
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
                  <FileCheck className="h-4 w-4" />
                  <span className="text-sm">Security scan passed</span>
                </div>
              )}
              
              {scanStatus === 'failed' && (
                <div className="mt-3 flex items-center space-x-2 text-red-500">
                  <Ban className="h-4 w-4" />
                  <span className="text-sm">Security scan failed - file rejected</span>
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
