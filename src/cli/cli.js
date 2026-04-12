// root to call in bin
import { ensureGlobalConfig, loadConfig } from "../config.js";
import { request } from "../server/internal-handler.js";
import { startServer } from "../server/server.js";
import { pretty, prettyList, tableRow } from "./print.js";

export async function run(argv) {
  const command = argv[2];
  console.log(argv);
  console.log(process.cwd());
  const a1 = argv[3];
  const a2 = argv[4];
  const a3 = argv[5];
  await ensureGlobalConfig();

  switch (command) {
    //sites
    case "init":
      return await init(null, null);
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
      return await stop(null);
    default:
      console.log("Unknown command");
  }
}

const pathPrefix="/__sivu/__internal/";

//sites
async function init(location, projectName) {

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

async function stop(env) {

}