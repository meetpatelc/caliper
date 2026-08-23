export const PARENT_NAME = "Instrument";
export const PARENT_WORDMARK = "INSTRUMENT";
export const THEME_KEY = "instrument-theme";
export const APP_DESCRIPTION =
  "Instrument is a calculator you can trust because the model is in the frame. Open a finished one, or write your own. Project keeps them on this device.";

export function isGaugePath(pathname: string) {
  return (
    pathname === "/atlas" ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/workshop")
  );
}
