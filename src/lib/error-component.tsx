import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { ErrorState } from "@/components/ui/status";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center text-fg">
      <div>
        <TriangleAlert className="mx-auto size-10 text-danger" strokeWidth={2} />
        <h1 className="page-title mt-4">Something went wrong</h1>
        <ErrorState className="mt-2 max-w-md break-words text-muted">
          {error.message || "An unexpected error occurred. Try reloading the page."}
        </ErrorState>
      </div>
    </main>
  );
}