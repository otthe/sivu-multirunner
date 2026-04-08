import { createContext } from "../runtime/context.js";
import { siteRegistry } from "../server/registry.js";
import { TemplateExit, TemplateRedirect, TemplateResponse } from "../utils/error.js";
import { stripLeadingSlashes } from "../utils/string.js";
import { compileTemplateString } from "./parser.js";

function requireRuntime(runtime) {
  if (!runtime || typeof runtime !== "object") {
    throw new Error("renderTemplateByName requires runtime = { projectDir, config }");
  }
  const { projectDir, config } = runtime;
  if (!projectDir || typeof projectDir !== "string") {
    throw new Error("runtime.projectDir is required");
  }
  if (!config || typeof config !== "object") {
    throw new Error("runtime.config is required");
  }
  if (!config.template_dir_location) {
    throw new Error("config.template_dir_location is required");
  }
  return { projectDir, config };
}

export async function renderTemplateByName(templateName, req = {}, runtime) {
  console.log("runtime is: ");
  console.log(runtime);

  const {projectDir, config} = requireRuntime(runtime);

  const templateCache = siteRegistry.get(req.site.host).templateCache;
  const scriptCache = siteRegistry.get(req.site.host).scriptCache;
  // console.log(config);
  console.log(templateCache);

  //console.log(req.site.host);
  const TEMPLATE_DIR = req.site.rootDir;
  const INCLUDE_TOKEN = /<\?include\s+["']([\s\S]*?)["']\s*\?>/g;
  const LAYOUT_FILE = "_layout.sivu";
  const YIELD_MARKER_RE = /<\?=\s*\$yield\s*\(\s*\)\s*;?\s*\?>/;
  const MAX_COMPILED = 500; // strings
  const MAX_SCRIPTS  = 200; // vm.Script objects

  console.log(TEMPLATE_DIR);

  return "";
}