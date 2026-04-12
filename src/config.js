import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const baseDir =
  process.platform === "win32"
    ? path.join(process.env.APPDATA, "sivu")
    : path.join(os.homedir(), ".sivu");

const configPath = path.join(baseDir, "sivu-config.json");

export async function ensureGlobalConfig() {
  // ensure directory exists
  await fs.mkdir(baseDir, { recursive: true });

  try {
    await fs.access(configPath);
  } catch {
    console.log("generating default config...");
    // file doesn't exist → create it
    // const defaultConfig = {
    //   defaultPort: 3000,
    //   logLevel: "info",
    // };

    // await fs.writeFile(
    //   configPath,
    //   JSON.stringify(defaultConfig, null, 2)
    // );

    // console.log("Created global config at:", configPath);
  }

  return configPath;
}

export const sivuConfig = {
  "server": {
    productionPort: 3000,
    devPort: 3000,
  },
  // "cli":{

  // },
  // "runtime":{

  // },
  // "sivu":{

  // },
}