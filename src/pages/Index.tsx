
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  ConsumptionData, 
  generatePredictions,
  getModelPerformance,
  generateMockData
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link, useNavigate } from 'react-router-dom';

interface IndexProps {
  loggedIn?: boolean;
}

const Index: React.FC<IndexProps> = ({ loggedIn = false }) => {
  // State for selected model and data
  const [selectedModel, setSelectedModel] = useState<string>('GRU');
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>([]);
  const [showAuthDialog, setShowAuthDialog] = useState<boolean>(false);
  
  // Get model performance metrics
  const modelMetrics = selectedModel && selectedModel !== 'none' 
    ? getModelPerformance(selectedModel) 
    : { mae: 0, mse: 0, r2: 0 };
  
  // Ref for PDF export
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  // Get auth context and navigation
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Load default data on component mount
  useEffect(() => {
    // Generate default data
    const defaultData = generateMockData();
    setConsumptionData(defaultData);
    
    // Set a default model
    if (selectedModel && selectedModel !== 'none') {
      const historicalData = defaultData.filter(item => !item.isPrediction);
      const newPredictions = generatePredictions(historicalData, 72, selectedModel);
      setConsumptionData([...historicalData, ...newPredictions]);
    }
  }, []);
  
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
    setSelectedModel('GRU'); // Set default model
    setConsumptionData(data); // Set historical data
    
    // Generate predictions with default model
    const historicalData = data.filter(item => !item.isPrediction);
    const newPredictions = generatePredictions(historicalData, 72, 'GRU');
    setConsumptionData([...historicalData, ...newPredictions]);
    
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
      <header className="bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Smart Grid Electricity Consumption Dashboard</h1>
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
                    Upload your CSV data files to analyze and visualize your energy consumption
                  </SheetDescription>
                </SheetHeader>
                <div className="py-6">
                  <EnhancedFileUploader onDataUploaded={handleDataUpload} />
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
          <p className="text-sm text-muted-foreground text-center">
            Smart Grid Electricity Consumption Dashboard © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
