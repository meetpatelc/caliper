import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { Bug, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";
import { submitFeedback } from "@/lib/feedback";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { SelectableCard } from "@/components/ui/selection";

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
      toast.success("Feedback saved on this device. Thank you.");
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
            <SelectableCard asChild selected={kind === "bug"} className="flex cursor-pointer gap-3 p-4">
              <label>
              <input type="radio" name="kind" className="sr-only" checked={kind === "bug"} onChange={() => setKind("bug")} />
              <Bug size={18} className="text-accent" />
              <span>
                <strong className="block">Report a bug</strong>
                <small className="text-muted">What happened, where, and what you expected.</small>
              </span>
              </label>
            </SelectableCard>
            <SelectableCard asChild selected={kind === "message"} className="flex cursor-pointer gap-3 p-4">
              <label>
              <input type="radio" name="kind" className="sr-only" checked={kind === "message"} onChange={() => setKind("message")} />
              <MessageSquareText size={18} className="text-accent" />
              <span>
                <strong className="block">Send a message</strong>
                <small className="text-muted">Request, idea, or other context.</small>
              </span>
              </label>
            </SelectableCard>
          </div>
        </fieldset>
        <Field htmlFor="feedback-message" label="Full message">
          <Textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={12} placeholder="Paste steps, values, and URLs." />
        </Field>
        <Button type="submit" variant="accent" disabled={pending} className="mt-4">
          <Send size={16} />
          {pending ? "Submitting" : "Submit"}
        </Button>
      </form>
    </div>
  );
}
