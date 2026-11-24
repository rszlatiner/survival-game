// Shared by scripts/check-no-books.mjs and tests/hygiene.test.ts.
// Pure: takes a list of repo-relative paths, returns the ones that look like textbook material.

const BOOK_EXTENSIONS = [".pdf", ".epub", ".djvu"];
const BOOK_DIRS = /^(books?|textbooks?)$/i;

/** Returns the paths that are textbook files (.pdf/.epub/.djvu) or sit under a directory named book(s)/textbook(s). */
export function findBookPaths(paths) {
  return paths.filter((p) => {
    const norm = String(p).replace(/\\/g, "/");
    const lower = norm.toLowerCase();
    if (BOOK_EXTENSIONS.some((ext) => lower.endsWith(ext))) return true;
    const dirs = norm.split("/").slice(0, -1);
    return dirs.some((d) => BOOK_DIRS.test(d));
  });
}
