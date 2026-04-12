import http from "node:http";

const SOCKET_PATH = "/tmp/sivu.sock";

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: SOCKET_PATH,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let body = "";

        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(body));
      }
    );

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// simulate: sivu add test
export async function run() {
  const res = await request("POST", "/__sivu/__internal/register", {
    name: "test-site",
  });

  console.log(res);
}