import { THEME_COLOR, THEME_KEY } from "@/lib/instrument";

/**
 * The pre-paint theme script, as one exported string.
 *
 * It has to be inline: it reads localStorage and sets the class on <html>
 * before first paint, and an external file would cost a blocking round trip to
 * avoid a flash of the wrong theme — trading one visible defect for another.
 *
 * Inline means a Content-Security-Policy needs its hash. Building the source
 * here rather than in the JSX gives the build one place to read it from, so the
 * hash in the header and the script in the page cannot drift. That matters more
 * than it sounds: this string interpolates THEME_KEY and both THEME_COLOR
 * values, so a hash written by hand goes stale the next time a colour changes,
 * and the symptom is the theme flashing on every load in production only.
 */
export const themeInitScript = `try{var t=localStorage.getItem('${THEME_KEY}');var r=document.documentElement;var d=t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){r.classList.add('dark');r.classList.remove('light')}else{r.classList.add('light');r.classList.remove('dark')}var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'${THEME_COLOR.dark}':'${THEME_COLOR.light}')}catch(e){}`;
