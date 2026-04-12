// root to call in bin
import fs from "node:fs";

import { ensureGlobalConfig, loadConfig } from "../config.js";
import { request } from "../server/internal-handler.js";
import { startServer } from "../server/server.js";
import { pretty, prettyList, tableRow } from "./print.js";

const pathPrefix="/__sivu/__internal/";

export async function run(argv) {
  const command = argv[2];
  const a1 = argv[3];
  const a2 = argv[4];
  const a3 = argv[5];
  await ensureGlobalConfig();

  switch (command) {
    //sites
    case "init":
      return await init(a1);//todo
    case "register":
      return await register(a1);
    case "unregister":
      return await unregister(a1);
    case "reload":
      return await reload();
    case "info":
      return await info();
    //server
    case "start":
      return await start(a1);
    case "stop":
      return await stop();
    default:
      console.log("Unknown command");
  }
}

//sites
async function init(projectName) {

}

async function register(hostname) {
  if (hostname === undefined) {
    throw new Error("Register command requires [hostname] as parameter!");
  }

  const res = await request("POST", pathPrefix+"register", {
    name: hostname,
    dir: process.cwd(),
  });

  pretty(res.msg);
  
  return res;
}

async function unregister(hostname) {
  if (hostname === undefined) {
    throw new Error("Unregister command requires [hostname] as parameter!");
  }

  const res = await request("POST", pathPrefix+"unregister", {
    name: hostname
  });

  pretty(res.msg);
}

async function reload() {
  const res = await request("post", pathPrefix+"reload", {});

  pretty(res.msg);

  return res;
}

async function info() {
  const obj = await request("get", pathPrefix+"info");

  for (const key in obj) {
    const site = obj[key]
    pretty("          " + key + "          ");
    pretty("( dir and memory sizes are rough estimations  )");
    for (const prop in site) {
      const prettyProp = prop.replace(/_/g, " ");
      tableRow(prettyProp, site[prop]);
    }
  }

  return obj;
}

//server
async function start(env) {
  const config = await loadConfig("sivu-config.json");
  const {sites} = await loadConfig("sivu-sites.json");
  if (config.server.env[env]) {
    startServer({port: config.server.env[env].port, env: env, sites: sites});
  } else {
    throw new Error(`Could not find environment ${env} -- check sivu-sites.json`);
  }
}

async function stop() {
  const PID_FILE = "/tmp/sivu.pid";

  if (!fs.existsSync(PID_FILE)) {
    console.log("Sivu is not running");
    return;
  }

  const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8"), 10);

  try {
    process.kill(pid, "SIGTERM");
    console.log("Sivu stopped");
  } catch (err) {
    console.error("Failed to stop:", err.message);
  }
}