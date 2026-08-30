import { createRootRoute, HeadContent, Outlet, Scripts, useRouter } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { AppShell } from "@/components/app-shell";
import { AppToaster } from "@/components/app-toaster";
import { APP_DESCRIPTION, PARENT_NAME, THEME_COLOR } from "@/lib/instrument";
import { themeInitScript } from "@/lib/theme-init";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: PARENT_NAME },
      { name: "description", content: APP_DESCRIPTION },
      { name: "theme-color", content: THEME_COLOR.light },
    ],
    links: [
      // SVG first for browsers that take one, then a real PNG for the several
      // that do not use an SVG as a tab icon at all. `/favicon.ico` is not
      // listed because it does not need to be — browsers request that path
      // regardless — but it has to exist, and it did not, so the tab fell back
      // to nothing.
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__pwa/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__pwa/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  // Set per request by the PWA middleware and stamped onto every script
  // TanStack emits. This one is ours, so it has to ask for the value itself —
  // without it the pre-paint theme script is the single thing CSP blocks, and
  // the symptom is a wrong-theme flash in production only.
  const nonce = useRouter().options.ssr?.nonce;
  return (
    <html lang="en" className="light antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/*
          `suppressHydrationWarning` is for the nonce, not the script body.
          Browsers hide a nonce once the document is parsed — the attribute
          reads back as empty while the property keeps the value — so React
          compares the server’s nonce against an empty string and reports a
          mismatch on every load. The markup is identical; the browser is
          deliberately concealing it.
        */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript() }}
        />
      </head>
      <body>
        <AuthProvider>
          <AppToaster />
          <AppShell>
            <Outlet />
          </AppShell>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
