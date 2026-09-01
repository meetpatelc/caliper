/**
 * Hand the browser a file.
 *
 * Two things about the obvious version are wrong, and both fail silently — the
 * button depresses, no file appears, and nothing is logged.
 *
 * The object URL was revoked on the line after `click()`. The click is
 * dispatched synchronously but the browser fetches the blob afterwards, so the
 * URL can be gone before anything reads it, and the download is cancelled
 * rather than failed. Revoking must wait until the fetch has had a turn.
 *
 * And the anchor was never in the document. Chrome will act on `click()` on a
 * detached element; Firefox will not, so the whole feature was inert there.
 *
 * The filename is built here too, because `"!!!".replace(/[^a-z0-9]+/g, "-")`
 * is `"-"` — truthy, so a fallback written as `|| "review"` never fires and the
 * file is called `--report.md`.
 */
export function downloadTextFile(name: string, contents: string, mimeType: string): void {
  const href = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = name;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // A macrotask, not a microtask: the fetch is queued by the click and a
  // promise continuation would still run before it.
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/** Slug for a download filename, with a fallback that actually fires. */
export function fileSlug(text: string, fallback: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}
