import { pathToFileURL } from "node:url";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import express from "express";
import http from "node:http";

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
        res.on("end", () => resolve(body));
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
  router.post("/register", (req, res) => {
    const { name } = req.body;

    console.log("Register called with:", name);

    res.json({ success: true, name });
  });

  router.post("/unregister", (req, res) => {
    const {name} = req.body;

    res.json({success: true, name})
  });

  router.post("/reload", (req, res) => {
    res.json({success: true, msg: "Sites reloaded"});
  });

  router.get("/info", (req, res) => {
    // for each project:
    // root dir size in mb (disk)
    // cached templates and scripts (ram)
    // info
  });

  //server
  router.post("/start", (req, res) => {

  });

  router.post("/stop", (req, res) => {

  });

  router.get("/status", (req, res) => {
    //server status
    //version
    //locations (config etc)
  });

  return router;
}