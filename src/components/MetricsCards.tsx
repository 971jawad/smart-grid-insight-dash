
import React from 'react';
import ReactApexChart from 'react-apexcharts';

interface MetricsCardsProps {
  mae: number;
  mse: number;
  r2: number;
  modelName?: string;
}

// Predefined real metrics for specific models
const MODEL_METRICS = {
  'Bidirectional LSTM': {
    mae: 0.06898624264029979,
    mse: 0.007775012006380435,
    r2: 0.8938474401619412
  }
};

const MetricsCards: React.FC<MetricsCardsProps> = ({ mae, mse, r2, modelName }) => {
  // Use real metrics if available for the selected model
  const metrics = modelName && MODEL_METRICS[modelName as keyof typeof MODEL_METRICS]
    ? MODEL_METRICS[modelName as keyof typeof MODEL_METRICS]
    : { mae, mse, r2 };
  
  // Configure circular charts for metrics
  const gaugeOptions = (value: number, max: number, title: string, color: string, format: string) => ({
    chart: {
      type: 'radialBar' as const,
      height: 220,
      toolbar: {
        show: false
      },
      fontFamily: 'Inter, sans-serif'
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: {
          margin: 0,
          size: '70%',
          background: '#fff',
          position: 'front' as const,
          dropShadow: {
            enabled: false
          }
        },
        track: {
          background: '#f2f2f2',
          strokeWidth: '100%',
          margin: 0
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: '16px',
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif',
            color: '#333',
            offsetY: -10
          },
          value: {
            show: true,
            fontSize: '30px',
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif',
            color: color,
            offsetY: 5,
            formatter: (val: any) => {
              if (format === 'percent') {
                return (value).toFixed(3);
              } else if (format === 'integer') {
                return Math.round(value).toString();
              }
              return value.toFixed(2);
            }
          }
        }
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'horizontal',
        shadeIntensity: 0.5,
        gradientToColors: [color],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100]
      }
    },
    stroke: {
      lineCap: 'round' as const
    },
    series: [calculatePercentage(value, max)],
    labels: [title],
    colors: [color]
  });

  // Calculate the percentage for the gauge based on the metric
  const calculatePercentage = (value: number, max: number) => {
    // For MAE and MSE, lower is better, so we invert the percentage
    if (value === metrics.mae || value === metrics.mse) {
      return Math.max(0, Math.min(100, 100 - (value / max * 100)));
    }
    // For R², higher is better (0-1 range)
    return Math.max(0, Math.min(100, value * 100));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg shadow-sm p-4 dark:bg-black dark:border dark:border-gray-800">
        <h3 className="text-lg font-semibold mb-2 text-center">Mean Absolute Error</h3>
        <ReactApexChart
          options={gaugeOptions(metrics.mae, 500, 'MAE', '#22c55e', 'number')}
          series={[calculatePercentage(metrics.mae, 500)]}
          type="radialBar"
          height={220}
        />
        <p className="text-center mt-4">
          <span className="block text-2xl font-bold">{metrics.mae.toFixed(5)} kWh</span>
          <span className="text-sm text-gray-500">Lower is better</span>
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-4 dark:bg-black dark:border dark:border-gray-800">
        <h3 className="text-lg font-semibold mb-2 text-center">Mean Squared Error</h3>
        <ReactApexChart
          options={gaugeOptions(metrics.mse, 100, 'MSE', '#3b82f6', 'number')}
          series={[calculatePercentage(metrics.mse, 100)]}
          type="radialBar"
          height={220}
        />
        <p className="text-center mt-4">
          <span className="block text-2xl font-bold">{metrics.mse.toFixed(8)}</span>
          <span className="text-sm text-gray-500">Lower is better</span>
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-4 dark:bg-black dark:border dark:border-gray-800">
        <h3 className="text-lg font-semibold mb-2 text-center">R² Score</h3>
        <ReactApexChart
          options={gaugeOptions(metrics.r2, 1, 'R²', '#8b5cf6', 'percent')}
          series={[calculatePercentage(metrics.r2, 1)]} 
          type="radialBar"
          height={220}
        />
        <p className="text-center mt-4">
          <span className="block text-2xl font-bold">{metrics.r2.toFixed(8)}</span>
          <span className="text-sm text-gray-500">Higher is better</span>
        </p>
      </div>
    </div>
  );
};

export default MetricsCards;
