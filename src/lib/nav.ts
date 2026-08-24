import { ClipboardList, Folder, LayoutGrid, PenLine } from "lucide-react";

export const PRIMARY_NAV = [
  {
    href: "/",
    label: "Library",
    icon: LayoutGrid,
    match: (path: string) => path === "/" || path.startsWith("/library") || path.startsWith("/tool/"),
  },
  { href: "/studio", label: "Studio", icon: PenLine, match: (path: string) => path.startsWith("/studio") },
  { href: "/review", label: "Review", icon: ClipboardList, match: (path: string) => path.startsWith("/review") },
  {
    href: "/workshop",
    label: "Project",
    icon: Folder,
    match: (path: string) => path.startsWith("/workshop") || path.startsWith("/projects"),
  },
] as const;

export const SECONDARY_NAV = [
  { href: "/about", label: "About & limits" },
  { href: "/feedback", label: "Feedback" },
  { href: "/reference", label: "Method library" },
] as const;

export const ACCOUNT_NAV = [
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Account settings" },
] as const;

export const PAGE_NAV = [
  ...PRIMARY_NAV.map(({ href, label }) => ({ href, label })),
  ...SECONDARY_NAV,
] as const;
