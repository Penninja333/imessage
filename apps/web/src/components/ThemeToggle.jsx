import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-full border border-default bg-surface p-1 shadow-sm">
      <Button
        variant={theme === "light" ? "primary" : "ghost"}
        isIconOnly
        className="size-11"
        onPress={() => setTheme("light")}
      >
        <Sun className="size-5" />
      </Button>
      <Button
        variant={theme === "dark" ? "primary" : "ghost"}
        isIconOnly
        className="size-11"
        onPress={() => setTheme("dark")}
      >
        <Moon className="size-5" />
      </Button>
    </div>
  );
}
