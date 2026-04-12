import { pathToFileURL } from "node:url";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import express from "express";
import http from "node:http";
import { loadConfig, writeConfig } from "../config.js";
import { loadSites } from "./server.js";
import { siteRegistry } from "./registry.js";

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

  router.get("/info", (req, res) => {
    // for each project:
    // root dir size in mb (disk)
    // cached templates and scripts (ram)
    // info
  });

  router.post("/stop", (req, res) => {

  });

  return router;
}