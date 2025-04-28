
import React, { useState } from 'react';
import { ConsumptionData } from '@/utils/mockData';
import { toast } from 'sonner';
import { useAuth } from '@/lib/authProvider';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GoogleDriveUploader from '@/components/GoogleDriveUploader';
import FileUploadZone from '@/components/FileUploadZone';
import FileStatusIndicator from '@/components/FileStatusIndicator';
import { processCSV, interpolateMissingMonths } from '@/utils/fileProcessing';
import { uploadToSupabase, scanFile } from '@/utils/supabaseStorage';

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

  const handleFileSelect = (file: File) => {
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
    
    if (!selectedFile.name.toLowerCase().endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setError('Only CSV files are accepted');
      toast.error('Only CSV files are accepted');
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
        return;
      }
      
      setScanStatus('passed');
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
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
              <FileUploadZone 
                onFileUpload={handleFileUpload}
                isUploading={isUploading}
              />
              
              <GoogleDriveUploader onFileSelected={handleGoogleDriveFile} />
              
              {selectedFile && !isUploading && (
                <FileStatusIndicator
                  selectedFile={selectedFile}
                  isUploading={isUploading}
                  scanStatus={scanStatus}
                  onProcess={processSelectedFile}
                />
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
