import { test, describe, it, expect, beforeEach, vi } from "vitest";
import { resolveGetTemplatePath } from "../../src/utils/path.js";

test("pretty url works", () => {
  expect(resolveGetTemplatePath("/about", { allow_pretty_urls: true }))
    .toBe("about.sivu");
});

test("should return custom root file if config.root_file is defined", () => {
  expect(resolveGetTemplatePath("/", { root_file: "custom.sivu"}))
    .toBe("custom.sivu");
});

test("should return index.sivu if config.root_file is not defined", () => {
  expect(resolveGetTemplatePath("", { root_file: ""}))
    .toBe("index.sivu");
});

test("should remove leading slashes and add .sivu ext", () => {
  expect(resolveGetTemplatePath("///index", { allow_pretty_urls: true, root_file: "custom.sivu"}))
    .toBe("index.sivu");
});

test("should only return .sivu extension", () => {
  expect(resolveGetTemplatePath("//////", { allow_pretty_urls: true, root_file: "custom.sivu"}))
    .toBe(".sivu");
});

test("rmv leading and trailing slashes and add dot sivu", () => {
  expect(resolveGetTemplatePath("///test///", { allow_pretty_urls: true, root_file: "custom.sivu"}))
    .toBe("test.sivu");
});

test("should split out query params", () => {
  expect(resolveGetTemplatePath("/profile?id=234324?name='test'", { allow_pretty_urls: true, root_file: "custom.sivu"}))
    .toBe("profile.sivu");
});

test("should split out query params nested", () => {
  expect(resolveGetTemplatePath("/users/profile?id=234324?name='test'", { allow_pretty_urls: true, root_file: "custom.sivu"}))
    .toBe("users/profile.sivu");
});
