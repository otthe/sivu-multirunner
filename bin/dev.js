
import { loadConfig } from "../src/config.js";
import { startServer } from "../src/server/server.js";

//run: nodemon bin/dev.js

const {sites} = await loadConfig("sivu-sites.json");
const config = {
  port: 3000,
  env: 'DEVELOPMENT_AUTOLOAD',
  sites: sites,
};
startServer(config);