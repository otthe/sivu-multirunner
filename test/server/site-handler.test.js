import { test, describe, it, expect, beforeEach, vi } from "vitest";
import { resolveGetTemplatePath } from "../../src/utils/path.js";
import { validatePublicTemplateRequest } from "../../src/server/site-handler.js";

test("should throw error if not valid .sivu file", () => {
  expect(() => validatePublicTemplateRequest("about"))
    .toThrow("Not a sivu file");
});

test("should throw error if not valid .sivu file", () => {
  expect(() => validatePublicTemplateRequest("about"))
    .toThrow("Not a sivu file");
});

test("should throw error if path contains private parts", () => {
  expect(() => validatePublicTemplateRequest("users/_admin/secret.sivu"))
    .toThrow("Private file not accessible");
});

test("should throw error if path contains private file parts", () => {
  expect(() => validatePublicTemplateRequest("users/admin/_secret.sivu"))
    .toThrow("Private file not accessible");
});