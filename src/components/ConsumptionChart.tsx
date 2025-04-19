
import React from 'react';
import { ConsumptionData } from '@/utils/mockData';
import ReactApexChart from 'react-apexcharts';

interface ConsumptionChartProps {
  data: ConsumptionData[];
}

const ConsumptionChart: React.FC<ConsumptionChartProps> = ({ data }) => {
  // Separate historical data and predictions
  const historicalData = data.filter(item => !item.isPrediction);
  const predictionData = data.filter(item => item.isPrediction);
  
  // Format the data for ApexCharts
  const historicalSeries = {
    name: 'Historical Consumption',
    data: historicalData.map(item => ({
      x: new Date(item.date).getTime(),
      y: item.consumption
    }))
  };
  
  const predictionSeries = {
    name: 'Predicted Consumption',
    data: predictionData.map(item => ({
      x: new Date(item.date).getTime(),
      y: item.consumption
    }))
  };
  
  const options = {
    chart: {
      type: 'line' as const,
      height: 400,
      toolbar: {
        show: true
      },
      animations: {
        enabled: true,
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      }
    },
    colors: ['#3b82f6', '#ef4444'],
    dataLabels: {
      enabled: false
    },
    stroke: {
      width: [3, 3],
      curve: 'smooth' as const,
      dashArray: [0, 5]
    },
    grid: {
      borderColor: '#e0e0e0',
      row: {
        colors: ['#f8f9fa', 'transparent'],
        opacity: 0.5
      }
    },
    markers: {
      size: 4,
      hover: {
        size: 7
      }
    },
    xaxis: {
      type: 'datetime' as const,
      title: {
        text: 'Time Period'
      },
      labels: {
        formatter: function(val: any) {
          return new Date(parseInt(val)).toLocaleDateString('default', {
            year: 'numeric',
            month: 'short'
          });
        }
      }
    },
    yaxis: {
      title: {
        text: 'Electricity Consumption (kWh)'
      },
      min: Math.min(...data.map(item => item.consumption)) * 0.8,
      max: Math.max(...data.map(item => item.consumption)) * 1.2
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: function(y: any) {
          return y.toLocaleString() + " kWh";
        }
      },
      x: {
        formatter: function(x: any) {
          return new Date(x).toLocaleDateString('default', {
            year: 'numeric',
            month: 'long'
          });
        }
      }
    },
    legend: {
      position: 'top' as const,
      horizontalAlign: 'right' as const,
      floating: false,
      offsetY: -25,
      offsetX: -5
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4">Electricity Consumption Forecast</h3>
      <div className="chart-container" style={{ height: '400px' }}>
        <ReactApexChart
          options={options}
          series={[historicalSeries, predictionSeries]}
          type="line"
          height={400}
        />
      </div>
    </div>
  );
};

export default ConsumptionChart;
