import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch();
for (const width of [390, 768, 900, 1024, 1180, 1279, 1280, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const head = document.querySelector("header");
    if (!head) return { fatal: "no header" };
    // If the stylesheet failed to load the header is static, not sticky --
    // an unstyled page otherwise measures as a clean pass.
    const styled = getComputedStyle(head).position === "sticky";
    const bar = Array.from(head.children).find((c) => c.getBoundingClientRect().height > 0);
    const cols = Array.from(bar.children).map((c) => Math.round(c.getBoundingClientRect().width));
    const boxes = Array.from(head.querySelectorAll("a,button")).map((el) => {
      const b = el.getBoundingClientRect();
      return { x: b.left, r: b.right, t: b.top, b: b.bottom, label: (el.innerText || el.getAttribute("aria-label") || "?").trim().slice(0, 14) };
    }).filter((b) => b.r > b.x && b.b > b.t);
    const collisions = [];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        if (a.x < c.r - 0.5 && c.x < a.r - 0.5 && a.t < c.b - 0.5 && c.t < a.b - 0.5) collisions.push(a.label + "/" + c.label);
      }
    return {
      styled, cols, sum: cols.reduce((a, b) => a + b, 0),
      headerH: Math.round(head.getBoundingClientRect().height),
      barH: Math.round(bar.getBoundingClientRect().height),
      collisions,
      escapes: boxes.filter((b) => b.r > window.innerWidth + 1 || b.x < -1).map((b) => b.label),
      docOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  if (r.fatal) { console.log(width, "FATAL", r.fatal); continue; }
  const ok = r.styled && r.sum <= width && !r.collisions.length && !r.escapes.length && !r.docOverflow && r.headerH === r.barH;
  console.log(`${String(width).padStart(5)}px ${ok ? "OK  " : "FAIL"} styled=${r.styled} cols=[${r.cols.join(",")}] sum=${r.sum} header=${r.headerH}/bar=${r.barH} collide=${r.collisions.join(",") || "-"} escape=${r.escapes.join(",") || "-"} docOv=${r.docOverflow}`);
  await page.close();
}
await browser.close();
