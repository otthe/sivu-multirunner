import path from "node:path";
import express from "express";
import session from "express-session";
import crypto from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
// import helmet from "helmet";
// import morgan from "morgan";

const sites = {
  "app1.test": {
    projectDir: "/home/null/Desktop/projects/sivu-multirunner/test/apps/app1/",
  },
  "app2.test": {
    projectDir: "/home/null/Desktop/projects/sivu-multirunner/test/apps/app2/",
  }
};

const app = express();
const siteRegistry = new Map();

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

async function loadConfig(projectDir) {
  const configPath = path.resolve(projectDir, "config.js");
  const url = pathToFileURL(configPath).href;

  // Works for both ESM and CommonJS config.js:
  // - ESM: module exports are on the namespace object
  // - CJS: module.exports is exposed as `default`
  const mod = await import(url);
  return mod.default ?? mod;
}

async function loadSites(sitesConfig) {
  for (const [host, site] of Object.entries(sitesConfig)) {
    try {
      const {config} = await loadConfig(site.projectDir);

      console.log(config.public_dir_location);
      
      const siteInfo = {
        host,
        ...site,
        config,
        publicDir: path.join(site.projectDir, config.public_dir_location),
        logDir: path.join(site.projectDir, config.log_dir_location),
        dataDir: path.join(site.projectDir, config.data_dir_location),
      };      
      siteInfo.handler = createSiteHandler(siteInfo);

      siteRegistry.set(host, siteInfo);
    } catch (err) {
      console.error(`Failed to load ${host}:`, err);
    }
  }
}

function createSiteHandler(site) {
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
  //router.get("*", async (req, res) => {
  router.use(async (req, res) => {
    try {
      const requested = resolveGetTemplatePath(req.path, site.config);
      const rel = validatePublicTemplateRequest(requested);

      // TODO: render
      res.send(`Render ${rel} for ${site.host}`);
    } catch (err) {
      console.error(err);
      res.status(404).send("Not found");
    }
  });

  return router;
}

// global middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
  const host = req.headers.host?.split(":")[0];
  const site = siteRegistry.get(host);

  if (!site) {
    return res.status(404).send("Unknown site");
  }

  return site.handler(req, res, next);
});

async function start() {
  await loadSites(sites);

  const port = 3000;

  app.listen(port, () => {
    console.log(`Multi-site server running on port ${port}`);
  });
}

start();