
import React from 'react';
import { FileCheck, FileWarning, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileStatusIndicatorProps {
  selectedFile: File;
  isUploading: boolean;
  scanStatus: 'pending' | 'scanning' | 'passed' | 'failed';
  onProcess: () => void;
}

const FileStatusIndicator: React.FC<FileStatusIndicatorProps> = ({
  selectedFile,
  isUploading,
  scanStatus,
  onProcess,
}) => {
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
          onClick={onProcess}
          disabled={isUploading || !selectedFile}
        >
          Process File
        </Button>
      </div>
    </div>
  );
};

export default FileStatusIndicator;
