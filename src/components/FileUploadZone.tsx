
import React from 'react';
import { Upload } from 'lucide-react';

interface FileUploadZoneProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onFileUpload, isUploading }) => {
  return (
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
          onChange={onFileUpload}
          disabled={isUploading}
        />
      </label>
    </div>
  );
};

export default FileUploadZone;
