export function pretty(msg) {
  const wrapped = "| " + msg + " |";
  const sep = "=".repeat(wrapped.length);
  console.log(sep);
  console.log(wrapped);
  console.log(sep);
}

export function prettyList(msg) {
  const mark = "|------>";
  console.log(mark + "  " + msg);
}

export function tableRow(key, value) {
  const wrapped = `| ${key}:  | ${value}  | `;
  const sep = ".".repeat(wrapped.length);
  console.log(sep);
  console.log(wrapped);
  console.log(sep);
}
