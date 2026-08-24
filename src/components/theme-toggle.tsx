import { Moon, Sun } from "lucide-react";
import { applyTheme, useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { SegmentedControl, SegmentedItem } from "@/components/ui/choice";

export function ThemeToggle({ appearance = "icon" }: { appearance?: "icon" | "labeled" | "segmented" }) {
  const [theme] = useTheme();
  if (appearance === "segmented") {
    return (
      <SegmentedControl aria-label="Appearance" appearance="solid">
        <SegmentedItem selected={theme === "light"} onClick={() => applyTheme("light")}>
          Light
        </SegmentedItem>
        <SegmentedItem selected={theme === "dark"} onClick={() => applyTheme("dark")}>
          Dark
        </SegmentedItem>
      </SegmentedControl>
    );
  }
  if (appearance === "labeled") {
    return (
      <Button type="button" variant="outline" aria-pressed={theme === "dark"} onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}>
        {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        {theme === "dark" ? "Light theme" : "Dark theme"}
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-pressed={theme === "dark"}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </Button>
  );
}
