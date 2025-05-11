
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Define model descriptions and characteristics
export const MODEL_CHARACTERISTICS = {
  'GRU': {
    description: 'Gated Recurrent Unit - A simpler RNN variant that handles long-term dependencies well.',
    seasonalStrength: 0.7,  // How strongly it captures seasonal patterns
    trendStrength: 0.8,     // How strongly it captures trend
    noiseReduction: 0.6,    // How well it filters out noise
  },
  'Bidirectional LSTM': {
    description: 'Processes data in both directions for improved context understanding.',
    seasonalStrength: 0.9,
    trendStrength: 0.85,
    noiseReduction: 0.8,
  },
  'DeepAR': {
    description: 'Deep AutoRegressive model - A probabilistic forecasting model with automatic feature extraction.',
    seasonalStrength: 0.8,
    trendStrength: 0.85,
    noiseReduction: 0.7,
  }
};

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (value: string) => void;
  isModelLoading?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange,
  isModelLoading = false
}) => {
  const modelInfo = selectedModel ? MODEL_CHARACTERISTICS[selectedModel as keyof typeof MODEL_CHARACTERISTICS] : null;

  return (
    <div className="w-full max-w-xs">
      <div className="flex items-center mb-1">
        <label className="block text-sm font-medium text-gray-700 mr-2">
          Select Forecasting Model
        </label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span><HelpCircle size={16} className="text-gray-400" /></span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{modelInfo?.description || 'Choose a model to generate predictions'}</p>
              {isModelLoading && <p className="text-amber-500 mt-1">Model is loading...</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Select value={selectedModel} onValueChange={onModelChange} disabled={isModelLoading}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select model for predictions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Default Data Visualization</SelectItem>
          <SelectItem value="GRU">GRU</SelectItem>
          <SelectItem value="Bidirectional LSTM">Bidirectional LSTM</SelectItem>
          <SelectItem value="DeepAR">DeepAR</SelectItem>
        </SelectContent>
      </Select>
      {isModelLoading && (
        <p className="text-xs text-amber-500 mt-1">Loading model from GitHub...</p>
      )}
    </div>
  );
};

export default ModelSelector;
