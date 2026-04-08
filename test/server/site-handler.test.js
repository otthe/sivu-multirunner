import { test, describe, it, expect, beforeEach, vi } from "vitest";
import { resolveGetTemplatePath } from "../../src/utils/path.js";
import { validatePublicTemplateRequest } from "../../src/server/site-handler.js";

test("pretty url works", () => {
  expect(resolveGetTemplatePath("/about", { allow_pretty_urls: true }))
    .toBe("about.sivu");
});

// test("pretty url works", () => {
//   expect(resolveGetTemplatePath("/about", { allow_pretty_urls: true }))
//     .toBe("about.sivu");
// });