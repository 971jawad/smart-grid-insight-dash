
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
  
  // Determine x-axis tick amount based on data size and view mode
  const getOptimalTickAmount = () => {
    if (yearFilter) {
      // For single year view, show all 12 months
      return 12;
    } else {
      // For multi-year view, calculate based on data points
      const dataSpan = filteredData.length;
      
      // Reduce tick density for better readability
      if (dataSpan <= 24) return 6; // Every 4 months for 2 years
      if (dataSpan <= 60) return 10; // About every 6 months for 5 years
      if (dataSpan <= 120) return 5; // Yearly for 10 years
      return Math.max(5, Math.floor(dataSpan / 36)); // Every 3 years for more than 10 years
    }
  };

  // Calculate min and max values for Y axis to prevent warnings
  const getYAxisMinMax = () => {
    // Get all consumption values
    const allValues = filteredData.map(item => item.consumption);
    if (allValues.length === 0) return { min: 0, max: 100 };
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    
    // Ensure min is less than max
    if (min === max) {
      return { min: min * 0.8, max: max * 1.2 };
    }
    
    // Add some padding
    return {
      min: Math.floor(min * 0.8),
      max: Math.ceil(max * 1.2)
    };
  };
  
  const yAxisRange = getYAxisMinMax();

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
          
          // Different formatting based on view mode and data density
          if (yearFilter) {
            // For year view, show all months
            return date.toLocaleDateString('default', {
              month: 'short'
            });
          } else {
            // For multi-year view
            const dataPointsCount = filteredData.length;
            
            if (dataPointsCount <= 24) {
              // For data up to 2 years, show month and year
              return date.toLocaleDateString('default', {
                month: 'short',
                year: '2-digit'
              });
            } else if (dataPointsCount <= 72) {
              // For data between 2-6 years, show quarter markers and year
              const month = date.getMonth();
              if (month % 3 === 0) {
                return `Q${Math.floor(month / 3) + 1} '${date.getFullYear().toString().slice(-2)}`;
              }
              return '';
            } else {
              // For data over 6 years, just show years
              if (date.getMonth() === 0) {
                return date.getFullYear().toString();
              }
              return '';
            }
          }
        },
        style: {
          colors: 'var(--chart-text-color, #718096)'
        },
        rotateAlways: false,
        hideOverlappingLabels: true,
        // Reduce label density to avoid overcrowding
        datetimeUTC: false,
        datetimeFormatter: {
          year: 'yyyy',
          month: "MMM 'yy",
          day: 'dd MMM',
          hour: 'HH:mm'
        }
      },
      tickAmount: getOptimalTickAmount(), // Reduced for less congestion
      axisBorder: {
        show: true,
        color: 'rgba(107, 114, 128, 0.3)'
      },
      axisTicks: {
        show: true,
        color: 'rgba(107, 114, 128, 0.3)'
      },
      // Improved tick placement
      tickPlacement: 'on'
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
      // Use pre-calculated min and max values to prevent warnings
      min: yAxisRange.min,
      max: yAxisRange.max,
      forceNiceScale: true,
      // Limit the number of ticks on y-axis
      tickAmount: 6
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
            No data available for this period
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsumptionChart;
