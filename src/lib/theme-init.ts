import { THEME_COLOR, THEME_KEY } from "@/lib/instrument";
import { inlineAdoptSource, THEME_STORAGE_KEY } from "@/lib/storage-keys";

/**
 * The pre-paint theme script, built on call.
 *
 * It has to be inline: it reads localStorage and sets the class on <html>
 * before first paint, and an external file would cost a blocking round trip to
 * avoid a flash of the wrong theme — trading one visible defect for another.
 *
 * A function, not a constant, and that distinction is load-bearing. As a
 * module-scope template literal this read THEME_COLOR at initialisation, which
 * is the same chunk-ordering fault that took the whole site down twice before:
 * if this module evaluates before the one it imports, the constant is undefined
 * and every route 500s. Built on call, it runs at render, long after every
 * module has initialised.
 *
 * Inline also means a Content-Security-Policy needs its hash. `scripts/csp.mjs`
 * reconstructs this exact string from source and hashes it, so the header and
 * the page cannot drift — which matters because this interpolates THEME_KEY and
 * both THEME_COLOR values, and a hash written by hand goes stale the next time
 * a colour changes, with the theme silently flashing in production only.
 */
export function themeInitScript() {
  // The migration runs first, inline, because this script is the very first
  // thing that reads the theme — anything later would paint the wrong one once
  // for anybody whose choice is still under the old key.
  return `${inlineAdoptSource(THEME_STORAGE_KEY)}try{var t=localStorage.getItem('${THEME_KEY}');var r=document.documentElement;var d=t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){r.classList.add('dark');r.classList.remove('light')}else{r.classList.add('light');r.classList.remove('dark')}var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'${THEME_COLOR.dark}':'${THEME_COLOR.light}')}catch(e){}`;
}
