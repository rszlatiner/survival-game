// Fails (exit 1) if git tracks any textbook file. Usage: npm run check:no-books
import { execFileSync } from "node:child_process";
import { findBookPaths } from "./no-books.mjs";

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\0")
  .filter(Boolean);
const bad = findBookPaths(tracked);
if (bad.length > 0) {
  console.error("Textbook material must never be committed. Remove these from git (git rm --cached <path>):");
  for (const p of bad) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`OK: none of ${tracked.length} tracked files looks like a textbook.`);
