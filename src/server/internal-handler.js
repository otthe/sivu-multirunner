import { pathToFileURL } from "node:url";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import express from "express";

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