
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative w-10 h-10 rounded-full bg-secondary/20 border-secondary/30 hover:bg-secondary/40 transition-all duration-300"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {theme === "dark" ? (
          <Moon className="h-5 w-5 text-blue-200 transition-transform duration-500 animate-fade-in" />
        ) : (
          <Sun className="h-5 w-5 text-amber-500 transition-transform duration-500 animate-fade-in" />
        )}
        <span className="sr-only">Toggle theme</span>
      </div>
    </Button>
  );
}
