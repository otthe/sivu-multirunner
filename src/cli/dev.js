import { sivuConfig } from "../config.js";
import { startServer } from "../server/server.js";

export async function run() {
  const config = {
    port: sivuConfig.server.devPort,
    env: 'DEVELOPMENT'
  }
  await startServer(config);
}