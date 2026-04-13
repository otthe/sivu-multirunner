// Site loading, server startup and global middleware
import path from "node:path";
import express from "express";
import session from "express-session";
import crypto from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { createSiteHandler } from "./site-handler.js";
import { siteRegistry } from "./registry.js";
import { createInternalHandler } from "./internal-handler.js";
import { pretty, prettyList } from "../cli/print.js";
import { loadConfig } from "../config.js";

const app = express();
app.set('trust proxy', true);

async function loadSiteConfig(projectDir) {
  const configPath = path.resolve(projectDir, "config.js");
  const url = pathToFileURL(configPath).href;

  // Works for both ESM and CommonJS config.js:
  // - ESM: module exports are on the namespace object
  // - CJS: module.exports is exposed as `default`
  const mod = await import(url);
  return mod.default ?? mod;
}

export async function loadSites(sitesConfig) {
  for (const [host, site] of Object.entries(sitesConfig)) {
    try {
      const {config} = await loadSiteConfig(site.projectDir);
      
      const siteInfo = {
        host,
        ...site,
        config,
        rootDir: path.join(site.projectDir, config.template_dir_location),
        publicDir: path.join(site.projectDir, config.public_dir_location),
        logDir: path.join(site.projectDir, config.log_dir_location),
        dataDir: path.join(site.projectDir, config.data_dir_location),
        scriptCache: new Map(),
        templateCache: new Map(),
        templateMeta: new Map(),
      };      

      siteInfo.handler = createSiteHandler(siteInfo);

      siteRegistry.set(host, siteInfo);

      prettyList(`Loaded: ${host} at ${site.projectDir}`);
      
    } catch (err) {
      console.error(`Failed to load ${host}:`, err);
    }
  }
}

// global middleware
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());

// handle only sites that exist
app.use((req, res, next) => {
  const host = req.headers.host?.split(":")[0];

  const site = siteRegistry.get(host);

  if (!site) {
    return res.status(404).send("Unknown site");
  }

  req.site = site;

  return site.handler(req, res, next);
});

export async function startServer(config) {
  const SOCKET_PATH = "/tmp/sivu.sock";
  const PID_FILE = "/tmp/sivu.pid";

  if (fs.existsSync(PID_FILE)) {
    console.log("Server already running?");
  }

  await loadSites(config.sites);

  app.listen(config.port, () => {
    pretty(
      `Sivu server running on port ${config.port} in ${config.env} environment!`
    );

    fs.writeFileSync(PID_FILE, process.pid.toString());
    console.log("PID:", process.pid);
  });

  const internalApp = express();
  const internalHandler = await createInternalHandler();
  internalApp.use("/__sivu/__internal", internalHandler);

  // remove old socket if it exists
  if (fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
  }

  internalApp.listen(SOCKET_PATH, () => {
    pretty(`Internal API listening on ${SOCKET_PATH}`);
  });

  fs.chmodSync(SOCKET_PATH, 0o666);

  // cleanup on exit
  const cleanup = () => {
    if (fs.existsSync(SOCKET_PATH)) {
      fs.unlinkSync(SOCKET_PATH);
    }
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit();
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit();
  });
}

async function run() {
  const env = process.argv[2] || "DEVELOPMENT";

  const config = await loadConfig("sivu-config.json");
  const { sites } = await loadConfig("sivu-sites.json");

  if (!config.server.env[env]) {
    throw new Error(`Unknown environment: ${env}`);
  }

  await startServer({
    port: config.server.env[env].port,
    env,
    sites,
  });
}

//for cli start
//should only run on direct call like 'node server.js'
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}