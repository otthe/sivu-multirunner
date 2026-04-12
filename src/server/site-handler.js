// Creates router for the app
import { pathToFileURL } from "node:url";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import morgan from "morgan";

import { actionNameFromPage, resolveGetTemplatePath } from "../utils/path.js";
import { isTimingSafeEqual } from "../utils/string.js";
import { renderTemplateByName } from "../sivu/renderer.js";
import { TemplateExit, TemplateRedirect, TemplateResponse } from "../utils/error.js";

const APP_403_MESSAGE = "Forbidden";
const APP_404_MESSAGE = "Not found";

function isJsonRequest(req) {
  return req.is("application/json");
}

export function validatePublicTemplateRequest(rel) {
  if (!rel.endsWith(".sivu")) {
    throw new Error("Not a sivu file");
  }

  const parts = rel.split(path.sep);
  if (parts.some((p) => p.startsWith("_"))) {
    throw new Error("Private file not accessible");
  }

  return rel;
}

function sendResult(res, r) {
  res.status(r.status || 200);

  for (const [k, v] of Object.entries(r.headers || {})) {
    res.setHeader(k, v);
  }

  return res.send(r.body ?? "");
}

export function createSiteHandler(site) {
  const router = express.Router();

  // Static files
  router.use(
    express.static(site.publicDir, {
      maxAge: site.config.public_asset_caching_time,
      fallthrough: true,
      index: false,
    })
  );
  
  // Body parsing
  router.use(express.urlencoded({ extended: true }));
  router.use(express.json());

  router.use(
    session({
      secret: site.config.session_secret,
      resave: false,
      saveUninitialized: false, // safer default
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: Boolean(site.config.cookie_secure), // set true when behind HTTPS
      },
    })
  );

  // Optional: ensure a CSRF token exists for the session (so csrfField() can rely on it)
  router.use((req, _res, next) => {
    if (!req.session._csrfToken) {
      req.session._csrfToken = crypto.randomBytes(32).toString("hex");
    }
    next();
  });

  // nonce
  router.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString("base64");
    next();
  });

  // helmet
  router.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
  
          scriptSrc: [
            "'self'",
            (req, res) => `'nonce-${res.locals.nonce}'`
          ],
  
          styleSrc: [
            "'self'",
            (req, res) => `'nonce-${res.locals.nonce}'`
          ],
  
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],

          formAction: ["'self'"],
  
          objectSrc: ["'none'"],
          upgradeInsecureRequests: null,
          // upgradeInsecureRequests: [],
        },
      },
    })
  );

  if (site.config.force_csrf_middleware) {
    router.use((req, res, next) => {
      if (isJsonRequest(req)) return next();

      // Only enforce for state-changing methods (you can extend this)
      // in case where (it is not json request)
      if (
        req.method === "POST" ||
        req.method === "PUT" ||
        req.method === "PATCH" ||
        req.method === "DELETE"
      ) {
        const token = req.body?._csrf;
        const expected = req.session?._csrfToken;

        console.log("token:");
        console.log(token);

        if (!isTimingSafeEqual(String(token || ""), String(expected || ""))) {
          return res.status(403).send("Invalid CSRF token");
        }
      }
      next();
    });
  }

  //log to console
  router.use(morgan('combined'));

  // log to file
  const logPath = path.join(site.logDir, 'access.log');
  const accessLogStream = fs.createWriteStream(logPath, { flags: 'a' });
  router.use(morgan('combined', { stream: accessLogStream }));

  // Catch-all route for templates
  // https://www.reddit.com/r/node/comments/1nf16by/unable_to_use_appall_in_my_code_app_crash_in_esm/
  // https://expressjs.com/en/guide/migrating-5.html#path-syntax
  // should it call next()? prolly not
  //router.use(async (req, res) => {
  router.get('/{*splat}', async (req, res) => {
    try {
      const requested = resolveGetTemplatePath(req.path, site.config);
      const rel = validatePublicTemplateRequest(requested);

      const config = site.config;
      const projectDir = site.projectDir

      const result = await renderTemplateByName(rel, req, { projectDir, config });
      console.log("req");
      console.log(req.socket.localPort);
      sendResult(res, result);
    } catch (error) {
      const msg = String(error?.message || "");
      if (error instanceof TemplateResponse) {
        for (const [k, v] of Object.entries(error.headers || {})) res.setHeader(k, v);
        return res.status(error.status || 200).send(error.body ?? "");
      }
      if (msg.includes("Partial") || msg.includes("traversal") || msg.includes("Not a sivu")) {
        return res.status(403).send(APP_403_MESSAGE);
      }
      console.error(error);
      return res.status(404).send(APP_404_MESSAGE);
    }
  });

  const sivuRoute=/^\/.+\.sivu$/;

  router.post(sivuRoute, async (req, res) => {
    try {
      // 1) validate requested public .sivu page (not underscore)
      const relPage = validatePublicTemplateRequest(req.path);
     
      // 2) map to underscore action
      const relAction = actionNameFromPage(relPage);

      const config =site.config;
      const projectDir = site.projectDir;

      console.log(relAction);

      const result = await renderTemplateByName(relAction, req, { projectDir, config });

      sendResult(res, result);

    } catch (err) {
      if (err instanceof TemplateRedirect) {
        return res.redirect(err.status, err.location);
      }
      if (err instanceof TemplateExit) {
        return res.send(String(err.message || ""));
      }

      if (err instanceof TemplateResponse) {
        for (const [k, v] of Object.entries(err.headers || {})) res.setHeader(k, v);
        return res.status(err.status || 200).send(err.body ?? "");
      }

      const msg = String(err?.message || "");
      if (msg.includes("Partial") || msg.includes("traversal") || msg.includes("Not a sivu")) {
        return res.status(403).send(APP_403_MESSAGE);
      }

      console.error(err);
      return res.status(404).send(APP_404_MESSAGE);
    }
  });


  router.use((_req, res) => {
    res.status(404).send("404 Not found!");
  });


  return router;
}
