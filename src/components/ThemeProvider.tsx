
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Define the Attribute type to match what next-themes expects
type Attribute = "class" | "data-theme" | "data-mode" | string;

// Define the ThemeProviderProps interface manually as the import is causing issues
interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
  attribute?: Attribute | Attribute[] // Using our defined Attribute type
  enableSystem?: boolean
  enableColorScheme?: boolean
  forcedTheme?: string
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({ 
  children, 
  ...props 
}: ThemeProviderProps) {
  // Add a listener to apply transitions only after initial theme load
  React.useEffect(() => {
    // Add base dark mode styles
    const style = document.createElement('style');
    style.textContent = `
      .dark body {
        background-color: hsl(222.2 84% 4.9%);
        color: hsl(210 40% 98%);
      }
      
      .theme-transition-ready * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
      }

      .dark .glass {
        background-color: rgba(17, 24, 39, 0.7);
        backdrop-filter: blur(10px);
        border-color: rgba(79, 70, 229, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }
      
      .dark .card {
        background-color: rgba(17, 24, 39, 0.8);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        border-color: rgba(79, 70, 229, 0.1);
      }
      
      .dark {
        --chart-text-color: #d1d5db;
        color-scheme: dark;
      }
      
      :root {
        --chart-text-color: #4b5563;
        color-scheme: light;
      }
      
      .dark .recharts-cartesian-grid-horizontal line,
      .dark .recharts-cartesian-grid-vertical line {
        stroke: rgba(255, 255, 255, 0.1);
      }
      
      .dark .recharts-cartesian-axis-line {
        stroke: rgba(255, 255, 255, 0.2);
      }
      
      .dark .recharts-default-tooltip {
        background-color: rgba(17, 24, 39, 0.9) !important;
        border-color: rgba(79, 70, 229, 0.2) !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }
      
      .dark .bg-muted\/30 {
        background-color: rgba(38, 38, 38, 0.3);
      }
      
      .dark .text-muted-foreground {
        color: rgba(212, 212, 216, 0.7);
      }
      
      .dark .border-border\/40 {
        border-color: rgba(113, 113, 122, 0.4);
      }
      
      .dark .bg-accent\/30 {
        background-color: rgba(113, 113, 122, 0.15);
      }
      
      .dark .border-accent\/50 {
        border-color: rgba(113, 113, 122, 0.3);
      }
      
      .dark .bg-accent\/10 {
        background-color: rgba(113, 113, 122, 0.1);
      }
      
      .dark .bg-accent\/5 {
        background-color: rgba(113, 113, 122, 0.05);
      }
      
      .sonex-logo {
        filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.25));
      }
      
      .dark .sonex-logo {
        filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5));
      }
    `;
    document.head.appendChild(style);
    
    document.documentElement.classList.add('theme-transition-ready');
    
    return () => {
      document.documentElement.classList.remove('theme-transition-ready');
      document.head.removeChild(style);
    };
  }, []);
  
  return <NextThemesProvider {...props as any}>{children}</NextThemesProvider>
}
