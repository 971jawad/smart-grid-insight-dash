
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
    
    // Add monthly analysis on a new page
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.text('Monthly Consumption Analysis', pdfWidth / 2, 15, { align: 'center' });
    
    // Add month over month analysis
    pdf.setFontSize(12);
    pdf.text('Month-over-Month Comparison', 15, 25);
    
    // Group data by year and month
    const monthlyData: Record<string, Record<string, number>> = {};
    data.forEach(item => {
      const year = item.date.substring(0, 4);
      const month = item.date.substring(5, 7);
      if (!monthlyData[year]) monthlyData[year] = {};
      monthlyData[year][month] = item.consumption;
    });
    
    // Display month-over-month table
    pdf.setFontSize(10);
    let monthYPos = 35;
    
    // Month headers
    pdf.text('Year', 15, monthYPos);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    monthNames.forEach((month, index) => {
      pdf.text(month, 35 + index * 13, monthYPos);
    });
    monthYPos += 7;
    
    // Add a line separator
    pdf.line(15, monthYPos - 3, pdfWidth - 15, monthYPos - 3);
    
    // Year rows with monthly data
    for (const year of sortedYears) {
      pdf.text(year, 15, monthYPos);
      
      for (let i = 0; i < 12; i++) {
        const month = (i + 1).toString().padStart(2, '0');
        const consumption = monthlyData[year]?.[month] || 0;
        
        if (consumption > 0) {
          pdf.text(consumption.toFixed(0), 35 + i * 13, monthYPos);
        } else {
          pdf.text('-', 35 + i * 13, monthYPos);
        }
      }
      
      monthYPos += 7;
      
      // Add a new page if we're running out of space
      if (monthYPos > pdfHeight - 20 && year !== sortedYears[sortedYears.length - 1]) {
        pdf.addPage();
        monthYPos = 20;
        
        // Month headers again
        pdf.text('Year', 15, monthYPos);
        monthNames.forEach((month, index) => {
          pdf.text(month, 35 + index * 13, monthYPos);
        });
        monthYPos += 7;
        pdf.line(15, monthYPos - 3, pdfWidth - 15, monthYPos - 3);
      }
    }
    
    // Add statistical insights
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.text('Statistical Insights', pdfWidth / 2, 15, { align: 'center' });
    
    // Find overall stats
    const allConsumption = data.map(item => item.consumption);
    const maxConsumption = Math.max(...allConsumption);
    const minConsumption = Math.min(...allConsumption);
    const avgConsumption = allConsumption.reduce((sum, val) => sum + val, 0) / allConsumption.length;
    
    // Find highest and lowest months overall
    const highestMonth = [...data].sort((a, b) => b.consumption - a.consumption)[0];
    const lowestMonth = [...data].sort((a, b) => a.consumption - b.consumption)[0];
    
    pdf.setFontSize(12);
    pdf.text('Overall Statistics', 15, 25);
    
    pdf.setFontSize(10);
    let statYPos = 35;
    
    pdf.text(`Highest Monthly Consumption: ${maxConsumption.toFixed(2)} kWh (${new Date(highestMonth.date).toLocaleDateString('default', {year: 'numeric', month: 'long'})})`, 20, statYPos);
    statYPos += 7;
    
    pdf.text(`Lowest Monthly Consumption: ${minConsumption.toFixed(2)} kWh (${new Date(lowestMonth.date).toLocaleDateString('default', {year: 'numeric', month: 'long'})})`, 20, statYPos);
    statYPos += 7;
    
    pdf.text(`Average Monthly Consumption: ${avgConsumption.toFixed(2)} kWh`, 20, statYPos);
    statYPos += 7;
    
    // Calculate seasonal patterns
    pdf.setFontSize(12);
    pdf.text('Seasonal Patterns', 15, statYPos + 10);
    statYPos += 20;
    
    // Group by season
    const seasons: Record<string, number[]> = {
      'Winter (Dec-Feb)': [],
      'Spring (Mar-May)': [],
      'Summer (Jun-Aug)': [],
      'Fall (Sep-Nov)': []
    };
    
    data.forEach(item => {
      const month = parseInt(item.date.substring(5, 7));
      
      if (month === 12 || month === 1 || month === 2) {
        seasons['Winter (Dec-Feb)'].push(item.consumption);
      } else if (month >= 3 && month <= 5) {
        seasons['Spring (Mar-May)'].push(item.consumption);
      } else if (month >= 6 && month <= 8) {
        seasons['Summer (Jun-Aug)'].push(item.consumption);
      } else {
        seasons['Fall (Sep-Nov)'].push(item.consumption);
      }
    });
    
    // Calculate averages
    Object.entries(seasons).forEach(([season, values]) => {
      if (values.length > 0) {
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        pdf.text(`${season} Average: ${average.toFixed(2)} kWh`, 20, statYPos);
        statYPos += 7;
      }
    });
    
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
