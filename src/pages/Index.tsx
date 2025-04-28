
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
import EnhancedFileUploader from '@/components/EnhancedFileUploader';
import SummaryTable from '@/components/SummaryTable';
import { Printer, LogOut, User } from 'lucide-react';
import { toast } from "sonner";
import { useAuth } from '@/lib/authProvider';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";

const Index = () => {
  // State for selected model and data
  const [selectedModel, setSelectedModel] = useState<string>('none');
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>([]);
  
  // Get model performance metrics only when a model is selected and it's not 'none'
  const modelMetrics = selectedModel && selectedModel !== 'none' ? getModelPerformance(selectedModel) : { mae: 0, mse: 0, r2: 0 };
  
  // Ref for PDF export
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  // Get auth context
  const { user, signOut } = useAuth();
  
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
  
  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };
  
  // Generate initials for avatar fallback
  const getInitials = (name?: string): string => {
    if (!name) return "U";
    return name.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Get user's name from metadata if available
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Smart Grid Electricity Consumption Dashboard</h1>
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative rounded-full h-10 w-10 p-0">
                  <Avatar>
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>{userName}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div ref={dashboardRef} className="mb-6">
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
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full">Upload Data</Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Upload Data</SheetTitle>
                <SheetDescription>
                  Upload your CSV data files to analyze and visualize your energy consumption
                </SheetDescription>
              </SheetHeader>
              <div className="py-6">
                <EnhancedFileUploader onDataUploaded={handleDataUpload} />
              </div>
            </SheetContent>
          </Sheet>
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
