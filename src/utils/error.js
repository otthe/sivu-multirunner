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