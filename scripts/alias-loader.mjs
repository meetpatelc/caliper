import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const formula = join(root, "packages/formula/src/index.ts");
const ui = join(root, "packages/ui/src/index.ts");

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@instrument/formula") {
    return { url: pathToFileURL(formula).href, shortCircuit: true };
  }
  if (specifier === "@instrument/ui") {
    return { url: pathToFileURL(ui).href, shortCircuit: true };
  }
  if (specifier === "@instrument/ui/cn") {
    return { url: pathToFileURL(join(root, "packages/ui/src/cn.ts")).href, shortCircuit: true };
  }
  if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
  const without = specifier.slice(2);
  for (const file of [join(src, without), join(src, `${without}.ts`), join(src, `${without}.tsx`)]) {
    if (existsSync(file)) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
