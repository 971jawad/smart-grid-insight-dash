
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  ConsumptionData, 
  generatePredictions,
  getModelPerformance
} from '@/utils/mockData';
import { generatePdfReport } from '@/utils/pdfExport';
import ModelSelector from '@/components/ModelSelector';
import ConsumptionChart from '@/components/ConsumptionChart';
import MetricsCards from '@/components/MetricsCards';
import FileUploader from '@/components/FileUploader';
import SummaryTable from '@/components/SummaryTable';
import { Printer, LogIn, UserPlus } from 'lucide-react';
import { toast } from "sonner";
import { Link } from 'react-router-dom';

const Index = () => {
  // State for selected model and data
  const [selectedModel, setSelectedModel] = useState<string>('none');
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>([]);
  
  // Get model performance metrics only when a model is selected and it's not 'none'
  const modelMetrics = selectedModel && selectedModel !== 'none' ? getModelPerformance(selectedModel) : { mae: 0, mse: 0, r2: 0 };
  
  // Ref for PDF export
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  // Handle model change
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    
    if (model && model !== 'none' && consumptionData.length > 0) {
      // Get only historical data (remove any existing predictions)
      const historicalData = consumptionData.filter(item => !item.isPrediction);
      
      // Generate new predictions
      const newPredictions = generatePredictions(
        historicalData, 
        72, // 6 years of monthly predictions
        model
      );
      
      setConsumptionData([...historicalData, ...newPredictions]);
      toast.success(`Generated predictions using ${model} model`);
    } else {
      // If no model is selected or 'none' is selected, show only historical data
      setConsumptionData(prev => prev.filter(item => !item.isPrediction));
    }
  };
  
  // Handle data upload
  const handleDataUpload = (data: ConsumptionData[]) => {
    setSelectedModel('none'); // Reset model selection to 'none'
    setConsumptionData(data); // Set only historical data
    toast.success('Data uploaded successfully');
  };
  
  // Handle PDF generation
  const handleGeneratePdf = () => {
    generatePdfReport(
      dashboardRef,
      consumptionData,
      selectedModel,
      {
        mae: modelMetrics.mae,
        mse: modelMetrics.mse,
        r2: modelMetrics.r2
      }
    );
    toast.success("PDF report generated successfully");
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Smart Grid Electricity Consumption Dashboard</h1>
          <div className="flex items-center space-x-4">
            <Link to="/sign-in">
              <Button variant="outline" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Register
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div ref={dashboardRef}>
          {/* Top Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <ModelSelector 
              selectedModel={selectedModel} 
              onModelChange={handleModelChange} 
            />
            
            <div className="flex justify-end items-end">
              <Button 
                onClick={handleGeneratePdf}
                className="flex items-center gap-2"
              >
                <Printer size={18} />
                Export Report PDF
              </Button>
            </div>
          </div>
          
          {/* Main Chart */}
          <div className="mb-6">
            <ConsumptionChart data={consumptionData} />
          </div>
          
          {/* Metrics Cards - Only show when model is selected and not 'none' */}
          {selectedModel && selectedModel !== 'none' && (
            <div className="mb-6">
              <MetricsCards 
                mae={modelMetrics.mae} 
                mse={modelMetrics.mse} 
                r2={modelMetrics.r2} 
              />
            </div>
          )}
          
          {/* Summary Table */}
          <div className="mb-6">
            <SummaryTable data={consumptionData} />
          </div>
        </div>
        
        {/* File Upload Section */}
        <div className="mt-8">
          <FileUploader onDataUploaded={handleDataUpload} />
        </div>
      </main>
      
      <footer className="bg-card border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-muted-foreground text-center">
            Smart Grid Electricity Consumption Dashboard © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
