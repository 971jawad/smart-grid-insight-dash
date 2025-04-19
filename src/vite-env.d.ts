
/// <reference types="vite/client" />

// Make TypeScript recognize the window.ApexCharts global
declare global {
  interface Window {
    ApexCharts: any;
  }
}

// Augment the module definition for react-apexcharts
declare module 'react-apexcharts' {
  import { ComponentType } from 'react';
  
  interface ChartProps {
    type?: 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radialBar' | 'scatter' | 'bubble' | 'heatmap' | 'candlestick' | 'boxPlot' | 'radar' | 'polarArea' | 'rangeBar' | 'rangeArea' | 'treemap';
    height?: number | string;
    width?: number | string;
    series: any[];
    options: any;
    [key: string]: any;
  }
  
  const ReactApexChart: ComponentType<ChartProps>;
  export default ReactApexChart;
}
