
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Define the ThemeProviderProps interface manually as the import is causing issues
interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
  attribute?: string
  enableSystem?: boolean
  enableColorScheme?: boolean
  forcedTheme?: string
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({ 
  children, 
  ...props 
}: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
