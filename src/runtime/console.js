// https://developer.mozilla.org/en-US/docs/Web/API/console
// overwrite console methods to show additional information

export function createConsole(host) {
  const methods = ["log", "error", "warn", "info", "debug", "table", "exception", "timestamp"];
  const customConsole = {};

  methods.forEach((method) => {
    customConsole[method] = (...args) => {
      if (method === "table") {
        global.console[method](`[${host}]`);
        global.console[method](...args);
      } else {
        global.console[method](`[${host}]`, ...args);
      }
    };
  });

  return customConsole;
}