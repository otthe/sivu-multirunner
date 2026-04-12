import { request } from "../server/internal-handler.js";

// simulate: sivu add test
export async function run() {
  const res = await request("POST", "/__sivu/__internal/register", {
    name: "test-site",
  });

  console.log(res);
}