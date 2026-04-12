
import { startServer } from "../src/server/server.js";

const config = {
  port: 3000,
  env: 'DEVELOPMENT_AUTOLOAD'
};
startServer(config);