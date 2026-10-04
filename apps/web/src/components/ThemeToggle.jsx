import { Button } from "@heroui/react";
import { Moon, Sun, Droplets } from "lucide-react";
import { useTheme } from "../context/theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-border/80 bg-surface/80 p-0.5 shadow-sm backdrop-blur-md"
      role="group"
      aria-label="Theme mode"
    >
      <Button
        variant={theme === "light" ? "primary" : "ghost"}
        isIconOnly
        className="size-9 rounded-full transition-transform active:scale-95"
        title="Light Mode"
        aria-label="Light Mode"
        aria-pressed={theme === "light"}
        onPress={() => setTheme("light")}
      >
        <Sun className="size-4" />
      </Button>

      <Button
        variant={theme === "dark" ? "primary" : "ghost"}
        isIconOnly
        className="size-9 rounded-full transition-transform active:scale-95"
        title="Dark Mode"
        aria-label="Dark Mode"
        aria-pressed={theme === "dark"}
        onPress={() => setTheme("dark")}
      >
        <Moon className="size-4" />
      </Button>

      <Button
        variant={theme === "glass" ? "primary" : "ghost"}
        isIconOnly
        className={`size-9 rounded-full transition-all active:scale-95 ${
          theme === "glass"
            ? "ring-1 ring-white/30 shadow-md shadow-accent/20 bg-accent/20 text-accent"
            : ""
        }`}
        title="Liquid Glass Mode"
        aria-label="Liquid Glass Mode"
        aria-pressed={theme === "glass"}
        onPress={() => setTheme("glass")}
      >
        <Droplets className="size-4" />
      </Button>
    </div>
  );
}
