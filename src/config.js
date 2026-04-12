import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const baseDir =
  process.platform === "win32"
    ? path.join(process.env.APPDATA, "sivu")
    : path.join(os.homedir(), ".sivu");

const sitesPath = path.join(baseDir, "sivu-sites.json");
const configPath = path.join(baseDir, "sivu-config.json");


function pretty(msg) {
  const wrapped = "| " + msg + " |";
  const sep = "=".repeat(wrapped.length);
  console.log(sep);
  console.log(wrapped);
  console.log(sep);
}

export async function ensureGlobalConfig() {
  // ensure directory exists
  await fs.mkdir(baseDir, { recursive: true });
  try {
    await fs.access(sitesPath);
    await fs.access(configPath);
    pretty(`Config files located at ${baseDir}`);
  } catch {
    pretty("Generating default config...");

    await fs.writeFile(
      configPath,
      JSON.stringify(defaultConfig, null,2)
    );
    pretty(`Created Sivu config at: ${configPath}`);
    
    await fs.writeFile(
      sitesPath,
      JSON.stringify(defaultSites, null,2)
    );
    pretty(`Created site config at: ${sitesPath}`);
  }

  return {sitesPath, configPath};
}

const defaultSites = {
  "sites": {

  }
};

const defaultConfig = {
  "server": {
    "env": {
      "DEVELOPMENT": {
        "port": 3000,
        "sitePath": sitesPath
      },
      "PRODUCTION": {
        "port": 3000,
        "sitePath": sitesPath
      },
    },
  },
  
}