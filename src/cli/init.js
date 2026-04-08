// project scaffolding


export function run() {
  console.log("init");
}


// import fs from "fs";
// import path from "path";

// export function run() {
//   const name = process.argv[3] || "my-app";
//   const dir = path.resolve(process.cwd(), name);

//   fs.mkdirSync(dir);
//   fs.mkdirSync(path.join(dir, "root"));
//   fs.mkdirSync(path.join(dir, "public"));

//   fs.writeFileSync(
//     path.join(dir, "config.js"),
//     `export default {
//   root_file: "index.sivu"
// };`
//   );

//   fs.writeFileSync(
//     path.join(dir, "root/index.sivu"),
//     `<h1>Hello from Sivu</h1>`
//   );

//   console.log(`Created ${name}`);
// }