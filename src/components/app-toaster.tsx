import { Toaster } from "sonner";
import { useTheme } from "@/lib/theme";

export function AppToaster() {
  const [theme] = useTheme();
  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      // Without `closeButton` a toast can only be waited out. Sonner's swipe
      // works on a touchscreen and there is no equivalent with a mouse, so the
      // longest message here — the one explaining that this device's work was
      // kept separate from the account, which is two sentences and eight
      // seconds — sat over the bottom-right corner with no way to move it.
      closeButton
      toastOptions={{ className: "font-sans" }}
    />
  );
}
