const KEY = "instrument-feedback";

export async function submitFeedback(input: { data: { kind: "bug" | "message"; message: string; pagePath: string } }) {
  const message = input.data.message.trim();
  if (!message) throw new Error("Add a message before submitting.");
  if (message.length > 20000) throw new Error("Message is limited to 20,000 characters.");
  const record = {
    kind: input.data.kind,
    message,
    pagePath: input.data.pagePath.slice(0, 300),
    savedAt: new Date().toISOString(),
  };
  const existing = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown[];
  localStorage.setItem(KEY, JSON.stringify([record, ...existing].slice(0, 40)));
  return { ok: true as const };
}
