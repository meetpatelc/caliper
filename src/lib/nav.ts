import { ClipboardList, Folder, LayoutGrid, PenLine } from "lucide-react";

export const PRIMARY_NAV = [
  {
    href: "/",
    label: "Library",
    icon: LayoutGrid,
    match: (path: string) => path === "/" || path.startsWith("/library") || path.startsWith("/tool/"),
  },
  // "Build", not "Studio": the room is named for the job, not the venue, and
  // the obvious alternatives are taken — "Workbench" is Ansys's word for a
  // mechanical engineering environment, which is this catalogue's own aisle,
  // and "desk" is already this product's furniture (see the desk store, the
  // account sync, the 404). The URL stays /studio; renaming it would break
  // every short link anyone has already shared, and the label is what a
  // reader sees.
  { href: "/studio", label: "Build", icon: PenLine, match: (path: string) => path.startsWith("/studio") },
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
