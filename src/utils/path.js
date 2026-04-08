import path from "node:path";
import { stripLeadingSlashes } from "./string.js";

export function resolveGetTemplatePath(reqPath, config) {
  const clean = String(reqPath || "/").split("?")[0];

  if (clean === "/" || clean === "") {
    return config.root_file || "index.sivu";
  }

  let rel = clean.replace(/^\/+/, "").replace(/\/+$/, "");

  if (!config.allow_pretty_urls) {
    return rel;
  }

  if (rel.endsWith(".sivu")) {
    return rel;
  }

  return `${rel}.sivu`;
}

/**
 * Resolve a path under TEMPLATE_DIR safely.
 * Throws if escape is attempted.
 */
export function resolveUnderTemplateDir(TEMPLATE_DIR, requested) {
  const rel = stripLeadingSlashes(requested);
  const abs = path.resolve(TEMPLATE_DIR, rel);
  if (!abs.startsWith(TEMPLATE_DIR + path.sep)) {
    throw new Error("Path escapes template directory: " + requested);
  }
  return abs;
}

/**
 * Resolve an include path relative to baseDir, preventing escaping TEMPLATE_DIR.
 */
export function resolveIncludePath(TEMPLATE_DIR, baseDir, requested) {
  const rel = stripLeadingSlashes(requested);
  const target = path.resolve(baseDir, rel);
  if (!target.startsWith(TEMPLATE_DIR + path.sep)) {
    throw new Error("Include path escapes template directory: " + requested);
  }
  return target;
}