// Creates router for the app
import { pathToFileURL } from "node:url";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import morgan from "morgan";

import { resolveGetTemplatePath } from "../utils/path.js";
import { isTimingSafeEqual } from "../utils/string.js";
import { renderTemplateByName } from "../sivu/renderer.js";

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
  
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
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

  // Sessions (per-site config)
  router.use(
    session({
      secret: site.config.session_secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: Boolean(site.config.cookie_secure),
      },
    })
  );

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

      // TODO: render
      //res.send(`Render ${rel} for ${site.host}`);
      res.send(JSON.stringify(req.session));
    } catch (err) {
      console.error(err);
      res.status(404).send("Not found");
    }
  });

  return router;
}
