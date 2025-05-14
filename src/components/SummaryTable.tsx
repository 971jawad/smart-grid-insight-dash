
import React, { useState } from 'react';
import { ConsumptionData, generateYearlySummary } from '@/utils/mockData';
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

const SummaryTable: React.FC<SummaryTableProps> = ({ data }) => {
  const yearlySummary = generateYearlySummary(data);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  
  // Get array of years in sorted order
  const years = Object.keys(yearlySummary).sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending
  
  const toggleYear = (year: string) => {
    setExpandedYear(expandedYear === year ? null : year);
  };
  
  // Generate monthly data for a given year
  const generateMonthlyData = (year: string): MonthlyData[] => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    // Get all data for the year, including predictions
    const yearData = data.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getFullYear().toString() === year;
    });
    
    // Sort by month
    yearData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Create monthly data with change percentage
    const monthlyData: MonthlyData[] = [];
    
    for (let i = 0; i < yearData.length; i++) {
      const item = yearData[i];
      const monthIndex = new Date(item.date).getMonth();
      const previousMonthConsumption = i > 0 ? yearData[i-1].consumption : 0;
      const changePercentage = i > 0 
        ? ((item.consumption - previousMonthConsumption) / previousMonthConsumption) * 100
        : 0;
      
      monthlyData.push({
        month: monthNames[monthIndex],
        consumption: item.consumption,
        change: changePercentage,
        isPrediction: !!item.isPrediction
      });
    }
    
    // If year has incomplete months, fill them with zeros
    if (monthlyData.length < 12) {
      const existingMonths = new Set(monthlyData.map(m => m.month));
      
      // Add missing months with 0 values
      for (let i = 0; i < monthNames.length; i++) {
        const monthName = monthNames[i];
        if (!existingMonths.has(monthName)) {
          // For missing months, estimate value or set to 0
          const lastKnownValue = monthlyData.length > 0 
            ? monthlyData[monthlyData.length - 1].consumption 
            : 0;
          
          monthlyData.push({
            month: monthName,
            consumption: 0,
            change: 0,
            isPrediction: true // Mark as prediction since it's missing
          });
        }
      }
      
      // Re-sort by month order
      monthlyData.sort((a, b) => monthNames.indexOf(a.month) - monthNames.indexOf(b.month));
    }
    
    return monthlyData;
  };
  
  return (
    <div className="bg-card rounded-lg shadow-md p-4 overflow-hidden">
      <h3 className="text-lg font-semibold mb-4">Yearly Consumption Summary</h3>
      
      <div className="overflow-x-auto">
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
            {years.map((year) => {
              const summary = yearlySummary[year];
              const isExpanded = expandedYear === year;
              const hasPredictionData = data.some(item => 
                new Date(item.date).getFullYear().toString() === year && item.isPrediction
              );
              
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
                                          {i === 0 ? '-' : (
                                            <span className={`${
                                              month.change > 0 
                                                ? 'text-red-500' 
                                                : month.change < 0 
                                                  ? 'text-green-500' 
                                                  : ''
                                            }`}>
                                              {month.change.toFixed(2)}%
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
      </div>
    </div>
  );
};

export default SummaryTable;
