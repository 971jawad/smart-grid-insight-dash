
import React from 'react';
import { ConsumptionData } from '@/utils/mockData';
import ReactApexChart from 'react-apexcharts';

interface ConsumptionChartProps {
  data: ConsumptionData[];
  yearFilter?: string;
}

const ConsumptionChart: React.FC<ConsumptionChartProps> = ({ data, yearFilter }) => {
  // Filter data by year if yearFilter is provided
  const filteredData = yearFilter 
    ? data.filter(item => new Date(item.date).getFullYear().toString() === yearFilter)
    : data;
  
  // Separate historical data and predictions
  const historicalData = filteredData.filter(item => !item.isPrediction);
  const predictionData = filteredData.filter(item => item.isPrediction);
  
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
  
  // Build the chart series based on available data
  const series = [
    historicalSeries,
    ...(predictionData.length > 0 ? [predictionSeries] : [])
  ];
  
  // Calculate proper tickAmount based on data length
  const tickAmount = Math.min(
    12, // Maximum 12 ticks for readability
    Math.max(6, Math.ceil(filteredData.length / 10)) // At least 6 ticks, but increase with data volume
  );

  const options = {
    chart: {
      type: 'line' as const,
      height: 400,
      fontFamily: 'Inter, sans-serif',
      background: 'transparent',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
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
      borderColor: 'rgba(107, 114, 128, 0.3)',
      row: {
        colors: ['rgba(107, 114, 128, 0.1)', 'transparent'],
        opacity: 0.5
      },
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    markers: {
      size: 4,
      colors: ['#3b82f6', '#ef4444'],
      strokeWidth: 0,
      hover: {
        size: 7
      }
    },
    xaxis: {
      type: 'datetime' as const,
      title: {
        text: 'Time Period',
        style: {
          fontWeight: 500,
          cssClass: 'text-foreground'
        }
      },
      labels: {
        formatter: function(val: any) {
          const date = new Date(parseInt(val));
          // For year data show month and year
          if (yearFilter) {
            return date.toLocaleDateString('default', {
              month: 'short'
            });
          } else {
            // For multi-year data just show year or quarter
            return date.toLocaleDateString('default', {
              year: 'numeric',
              month: date.getMonth() % 3 === 0 ? 'short' : undefined
            });
          }
        },
        style: {
          colors: 'var(--chart-text-color, #718096)'
        },
        rotateAlways: false,
        hideOverlappingLabels: true,
      },
      tickAmount: tickAmount,
      axisBorder: {
        show: true,
        color: 'rgba(107, 114, 128, 0.3)'
      },
      axisTicks: {
        show: true,
        color: 'rgba(107, 114, 128, 0.3)'
      }
    },
    yaxis: {
      title: {
        text: 'Electricity Consumption (kWh)',
        style: {
          fontWeight: 500,
          cssClass: 'text-foreground'
        }
      },
      labels: {
        formatter: function(val: number) {
          return val.toLocaleString();
        },
        style: {
          colors: 'var(--chart-text-color, #718096)'
        }
      },
      min: function(min: number) { return Math.floor(min * 0.8); },
      max: function(max: number) { return Math.ceil(max * 1.2); },
      forceNiceScale: true
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: 'dark',
      style: {
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif'
      },
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
      offsetX: -5,
      labels: {
        colors: 'var(--chart-text-color, #718096)'
      },
      markers: {
        size: 8,
        strokeWidth: 0,
        radius: 12
      }
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: {
            height: 300
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    ]
  };
  
  return (
    <div className="bg-card rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4">Electricity Consumption {yearFilter ? `for ${yearFilter}` : 'Forecast'}</h3>
      <div className="chart-container" style={{ height: '400px' }}>
        {filteredData.length > 0 ? (
          <ReactApexChart
            options={options}
            series={series}
            type="line"
            height={400}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading data...
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsumptionChart;
