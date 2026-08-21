import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "sonner";
import { APP_NAME, MODEL_COUNT } from "@/lib/desk";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: `${APP_NAME} is a unit-aware engineering workspace: ${MODEL_COUNT} calculators with methods, assumptions, and sources in the same frame as the result.` },
      { name: "theme-color", content: "#e8eaed" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const bare = pathname === "/login";

  return (
    <html lang="en" className="light antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('caliper-metrology-theme');var r=document.documentElement;if(t==='dark'){r.classList.add('dark');r.classList.remove('light')}else{r.classList.add('light');r.classList.remove('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Toaster
            theme="system"
            position="bottom-right"
            toastOptions={{
              className: "font-sans",
            }}
          />
          {bare ? <Outlet /> : <AppShell><Outlet /></AppShell>}
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
