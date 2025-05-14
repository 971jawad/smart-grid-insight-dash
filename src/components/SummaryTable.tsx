
import React, { useState } from 'react';
import { ConsumptionData } from '@/utils/mockData';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import ConsumptionChart from './ConsumptionChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SummaryTableProps {
  data: ConsumptionData[];
}

interface MonthlyData {
  month: string;
  consumption: number;
  change: number;
  isPrediction: boolean;
}

interface YearlySummary {
  [year: string]: {
    totalConsumption: number;
    yearOverYearChange: number;
    highestMonth: {
      month: string;
      consumption: number;
    };
    lowestMonth: {
      month: string;
      consumption: number;
    };
    monthlyData: {
      [month: string]: {
        consumption: number;
        isPrediction: boolean;
      };
    };
  };
}

// Helper to generate yearly summary with corrected calculations
const generateYearlySummary = (data: ConsumptionData[]): YearlySummary => {
  // Create a sorted copy of the data to ensure we're working chronologically
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Initialize results object
  const result: YearlySummary = {};
  
  // Process all data points
  sortedData.forEach((item) => {
    const date = new Date(item.date);
    const year = date.getFullYear().toString();
    const monthIndex = date.getMonth();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[monthIndex];
    
    // Initialize year object if it doesn't exist
    if (!result[year]) {
      result[year] = {
        totalConsumption: 0,
        yearOverYearChange: 0,
        highestMonth: { month: "", consumption: 0 },
        lowestMonth: { month: "", consumption: Number.MAX_VALUE },
        monthlyData: {}
      };
    }
    
    // Update total consumption
    result[year].totalConsumption += item.consumption;
    
    // Update monthly data
    if (!result[year].monthlyData[month]) {
      result[year].monthlyData[month] = {
        consumption: item.consumption,
        isPrediction: !!item.isPrediction
      };
    } else {
      // If we already have this month (shouldn't happen with proper data)
      // but just in case, we'll update it
      result[year].monthlyData[month].consumption += item.consumption;
      // If any data point is a prediction, mark the month as prediction
      result[year].monthlyData[month].isPrediction = 
        result[year].monthlyData[month].isPrediction || !!item.isPrediction;
    }
    
    // Update highest/lowest month tracking
    if (item.consumption > result[year].highestMonth.consumption) {
      result[year].highestMonth = { month, consumption: item.consumption };
    }
    
    if (item.consumption < result[year].lowestMonth.consumption) {
      result[year].lowestMonth = { month, consumption: item.consumption };
    }
  });
  
  // Calculate year-over-year changes with proper percentage calculation
  const years = Object.keys(result).sort();
  for (let i = 1; i < years.length; i++) {
    const currentYear = years[i];
    const previousYear = years[i - 1];
    
    const currentConsumption = result[currentYear].totalConsumption;
    const previousConsumption = result[previousYear].totalConsumption;
    
    // Avoid division by zero
    if (previousConsumption > 0) {
      // Calculate percentage change rounded to 2 decimal places
      const percentageChange = ((currentConsumption - previousConsumption) / previousConsumption) * 100;
      result[currentYear].yearOverYearChange = parseFloat(percentageChange.toFixed(2));
    } else {
      result[currentYear].yearOverYearChange = 0;
    }
  }
  
  // Handle edge case for lowest month if we didn't find any valid low value
  for (const year in result) {
    if (result[year].lowestMonth.consumption === Number.MAX_VALUE) {
      result[year].lowestMonth.consumption = 0;
      result[year].lowestMonth.month = "N/A";
    }
  }
  
  return result;
};

const SummaryTable: React.FC<SummaryTableProps> = ({ data }) => {
  console.log(`SummaryTable: Received ${data.length} data points`);
  
  // Make a defensive copy of the data to prevent any side effects
  const safeData = [...data];
  
  // Log the range of years
  const years = Array.from(new Set(safeData.map(item => new Date(item.date).getFullYear().toString())));
  years.sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending
  console.log(`SummaryTable: Years available: ${years.join(', ')}`);
  
  // Generate correct yearly summary
  const yearlySummary = generateYearlySummary(safeData);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  
  // Get array of years in sorted order
  const sortedYears = Object.keys(yearlySummary).sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending
  
  const toggleYear = (year: string) => {
    setExpandedYear(expandedYear === year ? null : year);
  };
  
  // Generate monthly data for a given year with improved calculations
  const generateMonthlyData = (year: string): MonthlyData[] => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    // Create full monthly array with correct data
    const monthlyData: MonthlyData[] = [];
    
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const month = monthNames[monthIndex];
      
      // Get consumption for this month or default to 0
      const monthData = yearlySummary[year]?.monthlyData?.[month] || {
        consumption: 0, 
        isPrediction: true
      };
      
      // Calculate change from previous month
      let previousMonthConsumption = 0;
      
      if (monthIndex > 0) {
        // Get previous month in same year
        const prevMonth = monthNames[monthIndex - 1];
        previousMonthConsumption = yearlySummary[year]?.monthlyData?.[prevMonth]?.consumption || 0;
      } else {
        // For January, get December of previous year if available
        const prevYear = (parseInt(year) - 1).toString();
        if (yearlySummary[prevYear]) {
          previousMonthConsumption = yearlySummary[prevYear]?.monthlyData?.["December"]?.consumption || 0;
        }
      }
      
      // Calculate percentage change
      let changePercentage = 0;
      if (previousMonthConsumption > 0) {
        changePercentage = ((monthData.consumption - previousMonthConsumption) / previousMonthConsumption) * 100;
      }
      
      // Limit to reasonable percentage changes (avoid extreme outliers)
      if (changePercentage > 200) changePercentage = 200;
      if (changePercentage < -200) changePercentage = -200;
      
      monthlyData.push({
        month: month,
        consumption: monthData.consumption,
        change: parseFloat(changePercentage.toFixed(2)),
        isPrediction: monthData.isPrediction
      });
    }
    
    return monthlyData;
  };
  
  return (
    <div className="bg-card rounded-lg shadow-md p-4 overflow-hidden">
      <h3 className="text-lg font-semibold mb-4">Yearly Consumption Summary</h3>
      
      <div className="overflow-x-auto">
        {sortedYears.length > 0 ? (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/30">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Year
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Consumption (kWh)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Year-over-Year Change
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Highest Month
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Lowest Month
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedYears.map((year) => {
                const summary = yearlySummary[year];
                const isExpanded = expandedYear === year;
                const hasPredictionData = Object.values(summary.monthlyData).some(item => item.isPrediction);
                
                return (
                  <React.Fragment key={year}>
                    <tr className={`${isExpanded ? 'bg-accent/30' : 'bg-card'} hover:bg-accent/10 transition-colors`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {year} {hasPredictionData ? "(Predicted)" : ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {summary.totalConsumption.toLocaleString()} kWh
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {summary.yearOverYearChange === 0 
                          ? '-' 
                          : `${summary.yearOverYearChange.toFixed(2)}%`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {summary.highestMonth.month} ({summary.highestMonth.consumption.toLocaleString()} kWh)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {summary.lowestMonth.month} ({summary.lowestMonth.consumption.toLocaleString()} kWh)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex items-center gap-1"
                          onClick={() => toggleYear(year)}
                        >
                          {isExpanded ? (
                            <>
                              <span>Collapse</span> <ChevronUp size={16} />
                            </>
                          ) : (
                            <>
                              <span>Expand</span> <ChevronDown size={16} />
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="p-4 bg-accent/5">
                          <div className="space-y-6">
                            <div className="p-2">
                              <ConsumptionChart data={data} yearFilter={year} />
                            </div>
                            
                            <Card className="mx-auto max-w-5xl">
                              <CardContent className="pt-6">
                                <div className="flex items-center mb-4">
                                  <Calendar className="mr-2 h-5 w-5 text-primary" />
                                  <h4 className="text-md font-semibold">Monthly Details for {year}</h4>
                                </div>
                                
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Month</TableHead>
                                        <TableHead>Consumption (kWh)</TableHead>
                                        <TableHead>Change from Previous Month</TableHead>
                                        <TableHead>Data Type</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {generateMonthlyData(year).map((month, i) => (
                                        <TableRow key={i} className={month.isPrediction ? "bg-accent/10" : ""}>
                                          <TableCell className="font-medium">{month.month}</TableCell>
                                          <TableCell>{month.consumption.toLocaleString()}</TableCell>
                                          <TableCell>
                                            {(i === 0 && parseInt(year) === parseInt(years[years.length-1])) ? '-' : (
                                              <span className={`${
                                                month.change > 0 
                                                  ? 'text-red-500' 
                                                  : month.change < 0 
                                                    ? 'text-green-500' 
                                                    : ''
                                              }`}>
                                                {month.change === 0 ? '-' : `${month.change.toFixed(2)}%`}
                                              </span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {month.isPrediction ? (
                                              <span className="text-amber-500">Predicted</span>
                                            ) : (
                                              <span className="text-green-500">Historical</span>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            No yearly data available
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryTable;
