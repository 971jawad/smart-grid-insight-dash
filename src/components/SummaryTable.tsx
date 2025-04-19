
import React from 'react';
import { ConsumptionData, generateYearlySummary } from '@/utils/mockData';

interface SummaryTableProps {
  data: ConsumptionData[];
}

const SummaryTable: React.FC<SummaryTableProps> = ({ data }) => {
  const yearlySummary = generateYearlySummary(data);
  
  // Get array of years in sorted order
  const years = Object.keys(yearlySummary).sort();
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 overflow-x-auto">
      <h3 className="text-lg font-semibold mb-4">Yearly Consumption Summary</h3>
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Year
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Consumption (kWh)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Year-over-Year Change
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Highest Month
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Lowest Month
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {years.map((year) => {
            const summary = yearlySummary[year];
            return (
              <tr key={year}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {year}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {summary.totalConsumption.toLocaleString()} kWh
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {summary.yearOverYearChange === 0 
                    ? '-' 
                    : `${summary.yearOverYearChange.toFixed(2)}%`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {summary.highestMonth.month} ({summary.highestMonth.consumption.toLocaleString()} kWh)
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {summary.lowestMonth.month} ({summary.lowestMonth.consumption.toLocaleString()} kWh)
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SummaryTable;
