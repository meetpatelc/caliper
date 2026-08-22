import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { parseSearchPlain, stringifySearchPlain } from "@/lib/search-params";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    parseSearch: parseSearchPlain,
    stringifySearch: stringifySearchPlain,
  });
}
