import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  ConsumptionData, 
  generatePredictions,
  getModelPerformance,
} from '@/utils/mockData';
import { generatePdfReport } from '@/utils/pdfExport';
import ModelSelector from '@/components/ModelSelector';
import ConsumptionChart from '@/components/ConsumptionChart';
import MetricsCards from '@/components/MetricsCards';
import EnhancedFileUploader from '@/components/EnhancedFileUploader';
import SummaryTable from '@/components/SummaryTable';
import { Printer, LogOut, User, Upload } from 'lucide-react';
import { toast } from "sonner";
import { useAuth } from '@/lib/authProvider';
import { loadModel, MODEL_METRICS, fetchExcelData } from '@/utils/modelLoader';
import { processExcelData, prepareModelInput, denormalizeOutput, generateFutureDates } from '@/utils/dataProcessor';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link, useNavigate } from 'react-router-dom';
import * as tf from '@tensorflow/tfjs';

interface IndexProps {
  loggedIn?: boolean;
}

const Index: React.FC<IndexProps> = ({ loggedIn = false }) => {
  // State for selected model and data
  const [selectedModel, setSelectedModel] = useState<string>('none');
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>([]);
  const [showAuthDialog, setShowAuthDialog] = useState<boolean>(false);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  
  // Get model performance metrics
  const modelMetrics = selectedModel && selectedModel !== 'none' 
    ? MODEL_METRICS[selectedModel as keyof typeof MODEL_METRICS] || { mae: 0, mse: 0, r2: 0 }
    : { mae: 0, mse: 0, r2: 0 };
  
  // Ref for PDF export
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  // Get auth context and navigation
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Load Excel data on component mount
  useEffect(() => {
    const loadExcelData = async () => {
      setIsDataLoading(true);
      
      try {
        // Use processExcelData to fetch and process data
        const excelData = await processExcelData();
        
        if (excelData && excelData.length > 0) {
          console.log(`Successfully loaded ${excelData.length} data points`);
          setConsumptionData(excelData);
          toast.success('Historical data loaded successfully');
        } else {
          // Fallback to mock data if Excel fetch fails
          console.error('Failed to load data, excelData was empty or invalid');
          const mockData = generateMockData();
          setConsumptionData(mockData);
          toast.error('Failed to load Excel data, using mock data instead');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        const mockData = generateMockData();
        setConsumptionData(mockData);
        toast.error('Failed to load data, using mock data instead');
      } finally {
        setIsDataLoading(false);
      }
    };
    
    loadExcelData();
  }, []);
  
  // Generate mock data as fallback (only includes historical data, not future predictions)
  const generateMockData = (): ConsumptionData[] => {
    const data: ConsumptionData[] = [];
    
    // Generate mock data from 2020 to January 2025 (not future beyond that)
    const currentDate = new Date();
    const endYear = 2025;
    const endMonth = 1; // January
    
    for (let year = 2020; year <= endYear; year++) {
      // For end year, only generate up to end month
      const monthLimit = year === endYear ? endMonth : 12;
      
      for (let month = 1; month <= monthLimit; month++) {
        // Basic seasonal pattern with random variations
        const baseValue = 5000;
        const yearlyTrend = (year - 2020) * 200; // Increasing trend year by year
        const seasonalFactor = Math.sin((month - 1) / 12 * Math.PI * 2); // Seasonal variation
        const randomFactor = Math.random() * 500 - 250; // Random noise
        
        const consumption = Math.round(baseValue + yearlyTrend + seasonalFactor * 1000 + randomFactor);
        
        data.push({
          date: `${year}-${month.toString().padStart(2, '0')}-01`,
          consumption: Math.max(100, consumption), // Ensure positive consumption
          isPrediction: false
        });
      }
    }
    
    console.log(`Generated ${data.length} mock data points, ending at ${endYear}-${endMonth.toString().padStart(2, '0')}`);
    return data;
  };
  
  // Handle model change
  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    
    if (model === 'none') {
      // Reset to only historical data
      setConsumptionData(prevData => prevData.filter(item => !item.isPrediction));
      return;
    }
    
    if (consumptionData.length > 0) {
      setIsModelLoading(true);
      
      try {
        // Get only historical data (remove any existing predictions)
        const historicalData = consumptionData.filter(item => !item.isPrediction);
        
        if (model !== 'none') {
          // Load the TensorFlow model
          await loadModel(model);
          
          // Prepare input data for the model
          const modelInput = prepareModelInput(historicalData);
          
          // Generate future dates for predictions
          const lastDate = new Date(historicalData[historicalData.length - 1].date);
          const futureDates = generateFutureDates(lastDate, 72);
          
          // Generate predictions using our mock function for now
          // In a real scenario, you would use the actual TensorFlow model here
          const fallbackPredictions = generatePredictions(
            historicalData, 
            72, 
            model
          );
          
          setConsumptionData([...historicalData, ...fallbackPredictions]);
          toast.success(`Generated predictions using ${model} model`);
        }
      } catch (error) {
        console.error('Error loading model or generating predictions:', error);
        toast.error('Error generating predictions');
      } finally {
        setIsModelLoading(false);
      }
    }
  };
  
  // Handle data upload
  const handleDataUpload = (data: ConsumptionData[]) => {
    setConsumptionData(data); // Set data including predictions if model is selected
    toast.success('Data uploaded successfully');
  };
  
  // Handle upload click - show auth dialog if not logged in
  const handleUploadClick = () => {
    if (!user && !loggedIn) {
      setShowAuthDialog(true);
      return;
    }
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
  
  // Navigate to sign in page
  const handleSignInClick = () => {
    navigate('/sign-in');
  };
  
  // Navigate to register page
  const handleRegisterClick = () => {
    navigate('/register');
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
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest';
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card shadow-sm border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/465b9642-102f-4a7e-b6d9-cd6c3530a730.png" 
              alt="Sonex Logo" 
              className="h-10 w-10 object-contain sonex-logo" 
            />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold">Sonex Energy Analytics</h1>
              <span className="text-xs text-muted-foreground">Smart Grid Electricity Consumption Dashboard</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {(user || loggedIn) ? (
              // User is logged in, show avatar dropdown
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative rounded-full h-10 w-10 p-0">
                    <Avatar>
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>{userName}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // User is not logged in, show sign in button
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={handleSignInClick}>Sign In</Button>
                <Button onClick={handleRegisterClick}>Register</Button>
              </div>
            )}
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
              isModelLoading={isModelLoading}
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
            {isDataLoading ? (
              <div className="bg-card rounded-lg shadow-md p-4 h-[460px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  <span>Loading consumption data...</span>
                </div>
              </div>
            ) : (
              <div>
                <ConsumptionChart data={consumptionData} />
              </div>
            )}
          </div>
          
          {/* Metrics Cards - Only show when model is selected and not 'none' */}
          {selectedModel && selectedModel !== 'none' && (
            <div className="mb-6">
              <MetricsCards 
                mae={modelMetrics.mae} 
                mse={modelMetrics.mse} 
                r2={modelMetrics.r2} 
                modelName={selectedModel}
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
          {(user || loggedIn) ? (
            // User is logged in, show upload sheet
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Data
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Upload Data</SheetTitle>
                  <SheetDescription>
                    Upload your CSV or Excel data files to analyze and visualize your energy consumption
                  </SheetDescription>
                </SheetHeader>
                <div className="py-6">
                  <EnhancedFileUploader 
                    onDataUploaded={handleDataUpload}
                    selectedModel={selectedModel}
                  />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            // User is not logged in, show button that triggers auth dialog
            <>
              <Button variant="outline" className="w-full" onClick={handleUploadClick}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Data
              </Button>
              
              <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Authentication Required</DialogTitle>
                    <DialogDescription>
                      You need to sign in or register to upload your own data.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col space-y-3 py-4">
                    <Button onClick={handleSignInClick}>Sign In</Button>
                    <Button variant="outline" onClick={handleRegisterClick}>Register</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </main>
      
      <footer className="bg-card border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center md:flex-row md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <img 
                src="/lovable-uploads/465b9642-102f-4a7e-b6d9-cd6c3530a730.png" 
                alt="Sonex Logo" 
                className="h-6 w-6 object-contain sonex-logo" 
              />
              <span className="text-sm font-medium">Sonex Energy Analytics</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Smart Grid Electricity Consumption Dashboard
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
