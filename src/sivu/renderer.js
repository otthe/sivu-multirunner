import { promises as fs } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";

import { createContext } from "../runtime/context.js";
import { siteRegistry } from "../server/registry.js";
import { requireRuntime, TemplateExit, TemplateRedirect, TemplateResponse } from "../utils/error.js";
import { resolveIncludePath, resolveUnderTemplateDir } from "../utils/path.js";
import { stripLeadingSlashes } from "../utils/string.js";
import { compileTemplateString } from "./parser.js";
import { pruneCache } from "./cache.js";

const INCLUDE_TOKEN = /<\?include\s+["']([\s\S]*?)["']\s*\?>/g;
const LAYOUT_FILE = "_layout.sivu";
const YIELD_MARKER_RE = /<\?=\s*\$yield\s*\(\s*\)\s*;?\s*\?>/;
const MAX_COMPILED = 500; // strings
const MAX_SCRIPTS  = 200; // vm.Script objects

/**
 * Expand template source by inlining included templates recursively.
 * Returns one combined .sivu source string.
 */
async function expandTemplateSource(TEMPLATE_DIR, filePath, stack = []) {
  const normalized = path.resolve(filePath);

  if (!normalized.startsWith(TEMPLATE_DIR + path.sep)) {
    throw new Error("Template not allowed: " + normalized);
  }

  if (stack.includes(normalized)) {
    throw new Error("Include cycle detected: " + normalized);
  }

  let src;
  try {
    src = await fs.readFile(normalized, "utf8");
  } catch {
    throw new Error("Failed to read template: " + normalized);
  }

  const baseDir = path.dirname(normalized);
  const nextStack = stack.concat([normalized]);

  // Replace include tokens with expanded content (done on raw template before compile)
  let out = "";
  let lastIndex = 0;

  for (const match of src.matchAll(INCLUDE_TOKEN)) {
    const idx = match.index ?? 0;
    out += src.slice(lastIndex, idx);

    const includeRel = (match[1] || "").trim();
    const includeAbs = resolveIncludePath(TEMPLATE_DIR, baseDir, includeRel);

    const includedSource = await expandTemplateSource(TEMPLATE_DIR, includeAbs, nextStack);
    out += includedSource;

    lastIndex = idx + match[0].length;
  }

  out += src.slice(lastIndex);
  return out;
}

export async function renderTemplateByName(templateName, req = {}, runtime) {
  const {projectDir, config} = requireRuntime(runtime, "renderTemplateByName");
  const templateCache = siteRegistry.get(req.site.host).templateCache;
  const scriptCache = siteRegistry.get(req.site.host).scriptCache;
  const TEMPLATE_DIR = req.site.rootDir;
  const metadata = siteRegistry.get(req.site.host).templateMeta;

  const pagePath = resolveUnderTemplateDir(TEMPLATE_DIR, templateName);

  const benchmarkContext = performance.now();
  const { context, cleanup } = createContext(req, pagePath, runtime);
  console.log(`context creation took: ${performance.now() - benchmarkContext}`);

  try {
    // 1) Expand (inline) the page first
    const expandedPageSource = await expandTemplateSource(TEMPLATE_DIR, pagePath, []);

    let finalSource = expandedPageSource;
    let finalFilename = pagePath;

    // 2) Optional layout wrapping (PHP-style: layout before + page + layout after)
    if (config.use_layout_file) {
      // if template has metadata field "useLayout" set to false --> skip the use of layout
      if (Object.hasOwn(metadata, "useLayout") && !metadata.useLayout) {
        console.log(`Skipping layout on template: ${templateName}!`);
      } 
      // else abuse the yield-method
      else {
        const layoutPath = resolveUnderTemplateDir(TEMPLATE_DIR, LAYOUT_FILE);

        let expandedLayoutSource = null;
        try {
          await fs.access(layoutPath);
          expandedLayoutSource = await expandTemplateSource(TEMPLATE_DIR, layoutPath, []);
        } catch {
          expandedLayoutSource = null;
        }
  
        if (expandedLayoutSource) {
          const m = expandedLayoutSource.match(YIELD_MARKER_RE);
          if (!m) {
            throw new Error(`Layout file missing <?= $yield() ?> marker: ${LAYOUT_FILE}`);
          }
  
          const idx = m.index;
          const before = expandedLayoutSource.slice(0, idx);
          const after = expandedLayoutSource.slice(idx + m[0].length);
  
          finalSource = before + expandedPageSource + after;
          finalFilename = layoutPath;
        }
      }
    }

    // 3) Compile (cached)
    // Cache key should be stable across projects + templates.
    // Use the finalFilename (layout or page) plus a hash of the pagePath used.
    
    const sourceHash = crypto.createHash("sha1").update(finalSource).digest("hex");
    const cacheKey = `${finalFilename}::wrapped::${pagePath}::${sourceHash}`;

    let compiled;
    const t1Template = performance.now();
    if (config.cache_compiled_templates) {
      compiled = templateCache.get(cacheKey);
      if (!compiled) {
        compiled = compileTemplateString(finalSource);
        templateCache.set(cacheKey, compiled);
        pruneCache(templateCache, MAX_COMPILED);
      }
    } else {
      compiled = compileTemplateString(finalSource);
    }

    //console.log(compiled);

    const t2Template = performance.now();
    //console.log(`Compiling template for ${cacheKey} took ${t2Template - t1Template} milliseconds! `);

    let script;
    const t1Script = performance.now();
    if (config.cache_scripts) {
      script = scriptCache.get(cacheKey);
      if (!script) {
        script = new vm.Script(`(async () => { ${compiled} })()`, {
          filename: finalFilename});
        scriptCache.set(cacheKey, script);
        pruneCache(scriptCache, MAX_SCRIPTS);
      }
    } else {
      script = new vm.Script(`(async () => { ${compiled} })()`, {
        filename: finalFilename});
    }
    const t2Script = performance.now();
    //console.log(`Script construction for ${cacheKey} took ${t2Script - t1Script} milliseconds! `);
    
    try {
      console.log(context.$yield);
      //return await script.runInContext(context);
      const body = await script.runInContext(context);
      return {
        status: context.__sivu.response.status,
        headers: {...context.__sivu.response.headers},
        body: body
      }
    } catch (error) {
      if (error instanceof TemplateRedirect) throw error;
      if (error instanceof TemplateExit) return error.message || "";
      if (error instanceof TemplateResponse) throw error;
      throw error;
    }
  } finally {
    cleanup();
  }
}