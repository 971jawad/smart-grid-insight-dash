
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (value: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
  return (
    <div className="w-full max-w-xs">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Select Forecasting Model
      </label>
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="GRU">GRU</SelectItem>
          <SelectItem value="Bidirectional LSTM">Bidirectional LSTM</SelectItem>
          <SelectItem value="NBEATS">NBEATS</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector;
