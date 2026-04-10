export class TemplateExit extends Error {
  constructor(message = "") {
    super(message);
    this.name = "TemplateExit";
  }
}

export class TemplateRedirect extends Error {
  constructor(location, status = 303) {
    super("TEMPLATE_REDIRECT");
    this.name = "TemplateRedirect";
    this.location = location;
    this.status = status;
  }
}

export class TemplateResponse extends Error {
  constructor(body = "", { status = 200, headers = {} } = {}) {
    super("TEMPLATE_RESPONSE");
    this.name = "TemplateResponse";
    this.status = status;
    this.headers = headers;
    this.body = body;
  }
}

export function requireRuntime(runtime, callingFunc) {
  if (!runtime || typeof runtime !== "object") {
    throw new Error(`${callingFunc} requires runtime = { projectDir, config }`);
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
