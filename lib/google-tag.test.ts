import { describe, expect, it } from "vitest";
import {
  GA_MEASUREMENT_ID,
  GOOGLE_TAG_INLINE_SCRIPT,
  GOOGLE_TAG_SNIPPET,
  placeGoogleTagAtStartOfHead,
} from "./google-tag";

describe("placeGoogleTagAtStartOfHead", () => {
  it("inserts the official snippet immediately after <head>", () => {
    const html = `<html><head><meta charSet="utf-8"/><script src="/_next/chunk.js"></script></head><body></body></html>`;
    const result = placeGoogleTagAtStartOfHead(html);

    expect(result.startsWith(`<html><head>${GOOGLE_TAG_SNIPPET}`)).toBe(true);
    expect(result).toContain(`gtag/js?id=${GA_MEASUREMENT_ID}`);
    expect(GOOGLE_TAG_SNIPPET).toContain(`<script>${GOOGLE_TAG_INLINE_SCRIPT}</script>`);
  });

  it("does not leave a second gtag.js script from Next.js", () => {
    const html = `<html><head><script async="" src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script><script>${GOOGLE_TAG_INLINE_SCRIPT}</script></head></html>`;

    const result = placeGoogleTagAtStartOfHead(html);
    const scriptCount = result.split("googletagmanager.com/gtag/js").length - 1;
    expect(scriptCount).toBe(1);
  });
});
