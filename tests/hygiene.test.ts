import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { findBookPaths } from "../scripts/no-books.mjs";

const find = findBookPaths as (paths: string[]) => string[];

describe("findBookPaths", () => {
  it("flags a dummy PDF, ebook and anything under a books/textbook directory", () => {
    const list = ["app/page.tsx", "notes/unit-11.pdf", "x/Book.EPUB", "a.djvu", "textbook/ch1.txt", "docs/Books/ch2.md"];
    expect(find(list)).toEqual(["notes/unit-11.pdf", "x/Book.EPUB", "a.djvu", "textbook/ch1.txt", "docs/Books/ch2.md"]);
  });

  it("passes a clean list", () => {
    expect(find(["README.md", "content/units/unit-11.ts", "docs/SETUP.md", "lib/books-helper.ts"])).toEqual([]);
  });
});

describe("repository", () => {
  it("tracks no textbook files", () => {
    const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
    expect(find(tracked)).toEqual([]);
  });
});
