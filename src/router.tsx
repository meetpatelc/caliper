import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { NotFoundPage } from "@/components/missing-page";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    // Otherwise an unmatched URL gets TanStack Router's bare `<p>Not Found</p>`
    // with no shell and no way back, plus a server warning on every miss.
    defaultNotFoundComponent: NotFoundPage,
  });
}
