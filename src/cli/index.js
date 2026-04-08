// root to call in bin

export async function run(argv) {
  const command = argv[2];

  switch (command) {
    case "dev":
      return import("./dev.js").then(m => m.run());
    case "serve":
      return import("./serve.js").then(m => m.run());
    case "init":
      return import("./init.js").then(m => m.run());
    default:
      console.log("Unknown command");
  }
}