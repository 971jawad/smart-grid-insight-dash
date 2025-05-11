
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
        background-color: rgba(17, 17, 34, 0.7);
        backdrop-filter: blur(10px);
        border-color: rgba(255, 255, 255, 0.1);
      }
      
      .dark .card {
        background-color: rgba(17, 24, 39, 0.8);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
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
