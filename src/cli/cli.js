// root to call in bin
import fs from "node:fs";
import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from 'url';
import os from "node:os";

import { ensureGlobalConfig, loadConfig } from "../config.js";
import { request } from "../server/internal-handler.js";
import { startServer } from "../server/server.js";
import { pretty, prettyList, tableRow } from "./print.js";

const pathPrefix="/__sivu/__internal/";

function isProd() {
  return process.env.NODE_ENV === "production";
}

//module quirks...
function getDirName(){
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename)
  return __dirname;
}

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
    case "status":
      return await status();
    case "install":
      return await install();
    case "uninstall":
      return await uninstall();
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
// // ================================
//        server
// // ================================
async function start(env) {
  if (isProd()) {
    console.log("Use systemctl to start Sivu in production");
    return;
  }
  const PID_FILE = "/tmp/sivu.pid";
  if (fs.existsSync(PID_FILE)) {
    console.log("Sivu is already running! -- 'sivu status' for more information!");
    return;
  }

  const config = await loadConfig("sivu-config.json");

  if (!config.server.env[env]) {
    throw new Error(`Could not find environment ${env}`);
  }

  const serverPath = path.join(getDirName(), "../server/server.js");

  const out = fs.openSync("/tmp/sivu.log", "a");
  const err = fs.openSync("/tmp/sivu.err", "a");

  const child = spawn(process.execPath, [serverPath, env], {
    detached: true,
    stdio: ["ignore", out, err],
    cwd: process.cwd(),
  });

  child.unref();

  console.log(`Sivu started in ${env} mode`);
}

async function stop() {
  if (isProd()) {
    execSync("sudo systemctl stop sivu");
    return;
  }

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

async function status() {
  const PID_FILE = "/tmp/sivu.pid";

  if (!fs.existsSync(PID_FILE)) {
    console.log("Sivu is not running");
    return;
  }

  const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8"), 10);

  try {
    process.kill(pid, 0);
    console.log(`Sivu is running (PID: ${pid})`);
  } catch {
    console.log("Sivu not running but PID file exists");
  }
}

//posix support only!
async function install() {
  const __dirname = getDirName();

  const serverPath = path.resolve(__dirname, "../server/server.js");
  const servicePath = "/etc/systemd/system/sivu.service";
  const nodePath = process.execPath;

  const projectDir = path.resolve(__dirname, "../..");
  
  const config = await loadConfig("sivu-config.json");
  let loggingSettings = '';
  if (config.server.env["production"].logging) {
    loggingSettings = 
    `
    StandardOutput=append:${config.server.env["production"].access_log_path}
    StandardError=append:${config.server.env["production"].error_log_path}
    `;
  }

  const user = process.env.SUDO_USER || process.env.USER;
  const homeDir = os.homedir();
  const sivuHome = path.join(homeDir, ".sivu");

  const service = `
  [Unit]
  Description=Sivu Server
  After=network.target
  
  [Service]
  ExecStart=${nodePath} ${serverPath} production
  WorkingDirectory=${projectDir}
  
  Restart=always
  RestartSec=3
  
  User=${user}
  Environment=NODE_ENV=production
  Environment=SIVU_HOME=${sivuHome}

  ${loggingSettings}
  
  [Install]
  WantedBy=multi-user.target
  `;

  try {
    execSync(
      `echo ${JSON.stringify(service.trim())} | sudo tee ${servicePath} > /dev/null`
    );

    execSync("sudo systemctl daemon-reload");
    execSync("sudo systemctl enable sivu");
    execSync("sudo systemctl start sivu");

    console.log("Sivu installed and started!");
  } catch (error) {
    console.error("Install failed:", error.message);
  }
}

async function uninstall() {
  // if (process.getuid && process.getuid() !== 0) {
  //   console.log("Run with sudo");
  //   return;
  // }

  execSync("sudo systemctl stop sivu");
  execSync("sudo systemctl disable sivu");

  fs.unlinkSync("/etc/systemd/system/sivu.service");

  execSync("sudo systemctl daemon-reload");

  console.log("Sivu uninstalled");
}