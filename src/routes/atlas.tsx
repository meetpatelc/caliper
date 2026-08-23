import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/atlas")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
