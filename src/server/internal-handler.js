import { pathToFileURL } from "node:url";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import express from "express";
import http from "node:http";
import { loadConfig, writeConfig } from "../config.js";
import { loadSites } from "./server.js";
import { siteRegistry } from "./registry.js";
import { formatBytes, getFolderSize, getObjectSize } from "../utils/analytics.js";

const SOCKET_PATH = "/tmp/sivu.sock";

export function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: SOCKET_PATH,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let body = "";

        res.on("data", (chunk) => (body += chunk));
        //res.on("end", () => resolve(body));
        res.on("end", () => {
          try {
            const json = JSON.parse(body);
            resolve(json);
          } catch {
            resolve(body);
          }
        });
      }
    );

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

export function createInternalHandler() {
  const router = express.Router();

  router.use(express.json());

  //sites

  //maybe mount/unmount better name?
  router.post("/register", async (req, res) => {
    try {
      const { name, dir } = req.body;

      const sites = await loadConfig("sivu-sites.json");
      // console.log(sites);
      sites.sites[name.trim()] = {
        projectDir: dir
      }
  
      await writeConfig("sivu-sites.json", sites);
  
      const msg = `${name} registered! Run 'sivu reload' to activate it`;

      return res.json({ msg});
    } catch (error) {
      console.error(error);
    }
  });

  router.post("/unregister", async (req, res) => {
    try {
      const {name} = req.body;
      const sites = await loadConfig("sivu-sites.json");

      delete sites.sites[name.trim()];
      await writeConfig("sivu-sites.json", sites);
      siteRegistry.delete(name.trim());

      const msg = `${name} has been removed from site registry!`;      
      return res.json({msg: msg});
      
    } catch (error) {
      console.error(error);
    }

  });

  router.post("/init", (req, res) => {
    res.json({success: true, msg: "project scaffolded!"});
  });

  router.post("/reload", async (req, res) => {
    try {
      const {sites} = await loadConfig("sivu-sites.json");
      await loadSites(sites);
      return res.json({msg: "Sites reloaded!"});
    } catch (error) {
      console.error(error);
    }
  });

  router.get("/info", async (req, res) => {
    // for each project:
    // root dir size in mb (disk)
    // cached templates and scripts (ram)
    // info
    try {
      let result = {};
      for (const [key, value] of siteRegistry.entries()) {
        //console.log(key, value);
        const site = siteRegistry.get(key);
        //const size = await dirSize( site.projectDir );
        const size = await getFolderSize(site.projectDir);
        const cachedScripts = site.scriptCache.size;
        const cachedTemplates = site.templateCache.size;
        const scriptCacheBytes =  getObjectSize(site.scriptCache);
        const templateCacheBytes = getObjectSize(site.templateCache);
        const metadataCacheBytes = getObjectSize(site.templateMeta);
        result[key] = {
          hostname: site.host,
          dir: site.projectDir,
          dir_size_in_mb:formatBytes(size.size),
          amount_of_cached_scripts: cachedScripts,
          amount_of_cached_templates: cachedTemplates,
          script_cache_in_bytes: scriptCacheBytes,
          template_cache_in_bytes: templateCacheBytes,
          metadata_cache_in_bytes: metadataCacheBytes
        }
      }
      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Internal error" });
    }
  });

  router.post("/stop", (req, res) => {

  });

  return router;
}