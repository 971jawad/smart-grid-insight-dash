
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ConsumptionData, 
  generateMockData, 
  getModelPerformance
} from '@/utils/mockData';
import { generatePdfReport } from '@/utils/pdfExport';
import ModelSelector from '@/components/ModelSelector';
import ConsumptionChart from '@/components/ConsumptionChart';
import MetricsCards from '@/components/MetricsCards';
import FileUploader from '@/components/FileUploader';
import SummaryTable from '@/components/SummaryTable';
import { Printer } from 'lucide-react';

const Index = () => {
  // State for selected model and data
  const [selectedModel, setSelectedModel] = useState<string>('GRU');
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>(generateMockData());
  
  // Get model performance metrics
  const modelMetrics = getModelPerformance(selectedModel);
  
  // Ref for PDF export
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  // Handle data upload
  const handleDataUpload = (data: ConsumptionData[]) => {
    setConsumptionData(data);
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
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Smart Grid Electricity Consumption Dashboard</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div ref={dashboardRef}>
          {/* Top Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <ModelSelector 
              selectedModel={selectedModel} 
              onModelChange={setSelectedModel} 
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
          
          {/* Metrics Cards */}
          <div className="mb-6">
            <MetricsCards 
              mae={modelMetrics.mae} 
              mse={modelMetrics.mse} 
              r2={modelMetrics.r2} 
            />
          </div>
          
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
      
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-gray-500 text-center">
            Smart Grid Electricity Consumption Dashboard © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
