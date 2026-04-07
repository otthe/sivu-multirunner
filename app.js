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
    projectDir: "/home/null/Desktop/projects/sivu-multirunner/test/apps/app1",
  },
  "app2.test": {
    projectDir: "/home/null/Desktop/projects/sivu-multirunner/test/apps/app2",
  }
};

const app = express();
const siteRegistry = new Map();

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
      const configLocation = path.resolve(site.projectDir, "config.js");
      console.log(configLocation);
      siteRegistry.set(host, "lol");

      const config = await loadConfig(site.projectDir);
      console.log(config);

      console.log(`Loaded site: ${host}`);
      //console.log(site);
    } catch (err) {
      console.error(`Failed to load ${host}:`, err);
    }
  }
}

async function start() {
  await loadSites(sites);

  const port = 3000;

  app.listen(port, () => {
    console.log(`Multi-site server running on port ${port}`);
  });
}

start();