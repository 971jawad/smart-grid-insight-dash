
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ConsumptionData } from './mockData';

// Format number with commas
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

// Generate and download a PDF report
export const generatePdfReport = async (
  dashboardRef: React.RefObject<HTMLDivElement>,
  data: ConsumptionData[],
  model: string,
  metrics: { mae: number; mse: number; r2: number }
) => {
  if (!dashboardRef.current) return;
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  
  try {
    // Capture the dashboard as an image
    const canvas = await html2canvas(dashboardRef.current, {
      scale: 2,
      logging: false,
      useCORS: true
    });
    
    const dashboardImage = canvas.toDataURL('image/png');
    
    // Add title
    pdf.setFontSize(18);
    pdf.setTextColor(33, 33, 33);
    pdf.text('Smart Grid Electricity Consumption Report', pdfWidth / 2, 15, { align: 'center' });
    
    // Add dashboard image
    const imgHeight = (canvas.height * pdfWidth) / canvas.width / 2.5;
    pdf.addImage(dashboardImage, 'PNG', 0, 25, pdfWidth, imgHeight);
    
    // Add model details
    pdf.setFontSize(14);
    pdf.text(`Forecasting Model: ${model}`, 15, imgHeight + 35);
    
    // Add performance metrics
    pdf.setFontSize(12);
    pdf.text('Model Performance:', 15, imgHeight + 45);
    pdf.text(`Mean Absolute Error (MAE): ${metrics.mae.toFixed(2)} kWh`, 20, imgHeight + 55);
    pdf.text(`Mean Squared Error (MSE): ${metrics.mse.toFixed(2)}`, 20, imgHeight + 62);
    pdf.text(`R² Score: ${metrics.r2.toFixed(3)}`, 20, imgHeight + 69);
    
    // Group data by year
    const yearlyData: Record<string, number> = {};
    data.forEach(item => {
      const year = item.date.substring(0, 4);
      if (!yearlyData[year]) yearlyData[year] = 0;
      yearlyData[year] += item.consumption;
    });
    
    // Add yearly consumption table
    pdf.setFontSize(14);
    pdf.text('Yearly Consumption Summary', 15, imgHeight + 83);
    
    pdf.setFontSize(10);
    let yPos = imgHeight + 90;
    pdf.text('Year', 15, yPos);
    pdf.text('Consumption (kWh)', 60, yPos);
    pdf.text('YoY Change', 110, yPos);
    pdf.text('Highest Month', 150, yPos);
    yPos += 7;
    
    // Add a line separator
    pdf.setDrawColor(200, 200, 200);
    pdf.line(15, yPos - 3, pdfWidth - 15, yPos - 3);
    
    // Sort years for consistent display
    const sortedYears = Object.keys(yearlyData).sort();
    
    // Calculate year over year changes
    for (let i = 0; i < sortedYears.length; i++) {
      const year = sortedYears[i];
      const prevYear = i > 0 ? sortedYears[i - 1] : null;
      
      const consumption = yearlyData[year];
      let yoyChange = 0;
      
      if (prevYear) {
        yoyChange = ((consumption - yearlyData[prevYear]) / yearlyData[prevYear]) * 100;
      }
      
      // Find highest consumption month for this year
      const yearMonths = data.filter(item => item.date.startsWith(year));
      const highestMonth = [...yearMonths].sort((a, b) => b.consumption - a.consumption)[0];
      const monthName = highestMonth ? new Date(highestMonth.date).toLocaleString('default', { month: 'short' }) : '';
      
      pdf.text(year, 15, yPos);
      pdf.text(formatNumber(consumption), 60, yPos);
      pdf.text(prevYear ? `${yoyChange.toFixed(2)}%` : '-', 110, yPos);
      pdf.text(monthName, 150, yPos);
      
      yPos += 7;
      
      // Add a new page if we're running out of space
      if (yPos > pdfHeight - 20 && i < sortedYears.length - 1) {
        pdf.addPage();
        yPos = 20;
        
        // Add headers again on the new page
        pdf.text('Year', 15, yPos);
        pdf.text('Consumption (kWh)', 60, yPos);
        pdf.text('YoY Change', 110, yPos);
        pdf.text('Highest Month', 150, yPos);
        yPos += 7;
        pdf.line(15, yPos - 3, pdfWidth - 15, yPos - 3);
      }
    }
    
    // Add footer
    const today = new Date().toLocaleDateString();
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated on ${today} | Smart Grid Insight Dashboard`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
    
    // Save the PDF
    pdf.save('smart-grid-electricity-report.pdf');
    
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};
