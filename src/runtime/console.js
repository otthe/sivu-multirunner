// https://developer.mozilla.org/en-US/docs/Web/API/console
// overwrite console methods to show additional information

export function createConsole(host) {
  const methods = ["log", "error", "warn", "info", "debug", "table", "exception", "timestamp"];
  const customConsole = {};

  methods.forEach((method) => {
    customConsole[method] = (...args) => {
      global.console[method](`[${host}]`, ...args);
      global.console[method](...args);
    };
  });

  return customConsole;
}