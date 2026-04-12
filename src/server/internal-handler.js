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

  router.post("/register", (req, res) => {
    const { name } = req.body;

    console.log("Register called with:", name);

    res.json({ success: true, name });
  });

  return router;
}