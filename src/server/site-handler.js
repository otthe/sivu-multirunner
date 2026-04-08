// Creates router for the app
import { pathToFileURL } from "node:url";
import path from "node:path";
import express from "express";
import session from "express-session";
import crypto from "node:crypto";
import fs from "node:fs";

function resolveGetTemplatePath(reqPath, config) {
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

function validatePublicTemplateRequest(rel) {
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
  router.get('/{*splat}', async (req, res) => {
    try {
      const requested = resolveGetTemplatePath(req.path, site.config);
      const rel = validatePublicTemplateRequest(requested);

      console.log(requested);

      // TODO: render
      res.send(`Render ${rel} for ${site.host}`);
    } catch (err) {
      console.error(err);
      res.status(404).send("Not found");
    }
  });

  return router;
}
