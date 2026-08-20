import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { Bug, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";
import { submitFeedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feedback")({ component: FeedbackPage });

function FeedbackPage() {
  const [kind, setKind] = useState<"bug" | "message">("bug");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      toast.error("Add a message first.");
      return;
    }
    setPending(true);
    try {
      await submitFeedback({ data: { kind, message, pagePath: window.location.pathname } });
      setMessage("");
      toast.success("Feedback submitted. Thank you.");
    } catch {
      toast.error("Could not submit. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="page-wrap max-w-3xl">
      <p className="eyebrow">Product desk</p>
      <h1 className="display-title mt-3">Send a bug report or a message.</h1>
      <p className="mt-4 text-base leading-7 text-muted">Paste the full context. No account required.</p>
      <form className="mt-8" onSubmit={onSubmit}>
        <fieldset>
          <legend className="eyebrow">Message type</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className={cn("flex cursor-pointer gap-3 rounded-lg border p-4", kind === "bug" ? "border-accent" : "border-border")}>
              <input type="radio" name="kind" className="sr-only" checked={kind === "bug"} onChange={() => setKind("bug")} />
              <Bug size={18} className="text-accent" />
              <span>
                <strong className="block">Report a bug</strong>
                <small className="text-muted">What happened, where, and what you expected.</small>
              </span>
            </label>
            <label className={cn("flex cursor-pointer gap-3 rounded-lg border p-4", kind === "message" ? "border-accent" : "border-border")}>
              <input type="radio" name="kind" className="sr-only" checked={kind === "message"} onChange={() => setKind("message")} />
              <MessageSquareText size={18} className="text-accent" />
              <span>
                <strong className="block">Send a message</strong>
                <small className="text-muted">Request, idea, or other context.</small>
              </span>
            </label>
          </div>
        </fieldset>
        <label className="mt-6 grid gap-2">
          <span className="text-sm font-medium">Full message</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={12} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" placeholder="Paste steps, values, and URLs." />
        </label>
        <button type="submit" disabled={pending} className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg disabled:opacity-50">
          <Send size={16} />
          {pending ? "Submitting" : "Submit"}
        </button>
      </form>
    </div>
  );
}
