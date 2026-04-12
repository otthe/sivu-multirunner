// root to call in bin
import { ensureGlobalConfig } from "../config.js";
import { request } from "../server/internal-handler.js";

export async function run(argv) {
  const command = argv[2];
  await ensureGlobalConfig();

  switch (command) {
    //sites
    case "init":
      return await init(null, null);
    case "register":
      return await register(null, null);
    case "unregister":
      return await unregister(null);
    case "reload":
      return await reload();
    case "info":
      return await info();
    //server
    case "start":
      return await start(null);
    case "stop":
      return await stop(null);
    case "status":
      return await status(null);
    default:
      console.log("Unknown command");
  }
}

const pathPrefix="/__sivu/__internal/";

//sites
async function init(location, projectName) {

}

async function register(hostname, path) {
  const res = await request("POST", pathPrefix+"register", {
    name: "test-site",
  });
  console.log(res);
  return res;
}

async function unregister(hostname) {

}

async function reload() {

}

async function info() {

}

//server
async function start(env) {

}

async function stop(env) {

}

async function status(env) {
  
}
