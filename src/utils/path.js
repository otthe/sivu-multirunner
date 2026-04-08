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