
import React, { useState } from 'react';
import { ConsumptionData, generateYearlySummary } from '@/utils/mockData';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ConsumptionChart from './ConsumptionChart';
import { Button } from '@/components/ui/button';

interface SummaryTableProps {
  data: ConsumptionData[];
}

const SummaryTable: React.FC<SummaryTableProps> = ({ data }) => {
  const yearlySummary = generateYearlySummary(data);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  
  // Get array of years in sorted order
  const years = Object.keys(yearlySummary).sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending
  
  const toggleYear = (year: string) => {
    setExpandedYear(expandedYear === year ? null : year);
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
              
              return (
                <React.Fragment key={year}>
                  <tr className={`${isExpanded ? 'bg-accent/30' : 'bg-card'} hover:bg-accent/10 transition-colors`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {year}
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
                        <div className="p-2">
                          <ConsumptionChart data={data} yearFilter={year} />
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
