// Site loading, server startup and global middleware
import path from "node:path";
import express from "express";
import session from "express-session";
import crypto from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { createSiteHandler } from "./site-handler.js";
import { siteRegistry } from "./registry.js";
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

export async function startServer(config) {
  await loadSites(sites);

  app.listen(config.port, () => {
    console.log(`Sivu server running on port ${config.port} in ${config.env} environment!`);
  });
}