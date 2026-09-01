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

/**
 * What `aria-current` a primary nav link should carry.
 *
 * `match` is deliberately broad — Library covers every `/tool/…` page, Build
 * covers every draft — because the highlight marks the section you are in. But
 * that same flag was being spelled `aria-current="page"`, which does not mean
 * "in this section": it means this link points at the page you are on. So on
 * /tool/axial a screen reader announced "Library, current page" while the
 * reader was on Axial response, naming the wrong page as the current one.
 *
 * `page` when the link really is this page, `true` when it is the section
 * containing it — which is what `aria-current="true"` is for — and nothing at
 * all otherwise.
 */
export function navCurrent(
  item: { href: string; match: (path: string) => boolean },
  pathname: string,
): "page" | "true" | undefined {
  if (item.href === pathname) return "page";
  return item.match(pathname) ? "true" : undefined;
}
