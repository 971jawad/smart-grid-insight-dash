
import React from 'react';
import ReactApexChart from 'react-apexcharts';

interface MetricsCardsProps {
  mae: number;
  mse: number;
  r2: number;
}

const MetricsCards: React.FC<MetricsCardsProps> = ({ mae, mse, r2 }) => {
  // Configure circular charts for metrics
  const gaugeOptions = (value: number, max: number, title: string, color: string, format: string) => ({
    chart: {
      type: 'radialBar' as const,
      height: 200,
      offsetY: -10
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: {
          margin: 0,
          size: '70%',
          background: '#fff',
          position: 'front' as const
        },
        track: {
          background: '#e7e7e7',
          strokeWidth: '67%',
          margin: 0
        },
        dataLabels: {
          name: {
            offsetY: -10,
            color: '#333',
            fontSize: '13px'
          },
          value: {
            color,
            fontSize: '24px',
            show: true,
            formatter: (val: any) => {
              if (format === 'percent') {
                return `${(val * max / 100).toFixed(2)}`;
              }
              return `${Math.round(val * max / 100)}`;
            }
          }
        }
      }
    },
    fill: {
      colors: [color]
    },
    series: [value / max * 100],
    labels: [title]
  });

  // Normalize values for charts
  // Lower MAE and MSE are better, so we invert the percentage
  const maeNormalized = 100 - (mae / 500) * 100; // Assuming 500 is a bad MAE
  const mseNormalized = 100 - (mse / 100000) * 100; // Assuming 100,000 is a bad MSE
  const r2Normalized = r2 * 100; // R² is already between 0-1

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-2 text-center">Mean Absolute Error</h3>
        <ReactApexChart
          options={gaugeOptions(maeNormalized, 500, 'MAE', '#22c55e', 'number')}
          series={[maeNormalized]}
          type="radialBar"
          height={200}
        />
        <p className="text-center text-gray-700 mt-2">
          MAE: {mae.toFixed(2)} kWh
          <span className="block text-xs text-gray-500 mt-1">Lower is better</span>
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-2 text-center">Mean Squared Error</h3>
        <ReactApexChart
          options={gaugeOptions(mseNormalized, 100000, 'MSE', '#3b82f6', 'number')}
          series={[mseNormalized]}
          type="radialBar"
          height={200}
        />
        <p className="text-center text-gray-700 mt-2">
          MSE: {mse.toFixed(2)}
          <span className="block text-xs text-gray-500 mt-1">Lower is better</span>
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-2 text-center">R² Score</h3>
        <ReactApexChart
          options={gaugeOptions(r2Normalized, 1, 'R²', '#8b5cf6', 'percent')}
          series={[r2Normalized]}
          type="radialBar"
          height={200}
        />
        <p className="text-center text-gray-700 mt-2">
          R²: {r2.toFixed(3)}
          <span className="block text-xs text-gray-500 mt-1">Higher is better</span>
        </p>
      </div>
    </div>
  );
};

export default MetricsCards;
