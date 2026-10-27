import CJS_COMPAT_NODE_URL_383trhvngph from 'node:url';
import CJS_COMPAT_NODE_PATH_383trhvngph from 'node:path';
import CJS_COMPAT_NODE_MODULE_383trhvngph from "node:module";

var __filename = CJS_COMPAT_NODE_URL_383trhvngph.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_383trhvngph.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_383trhvngph.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------

// ../../node_modules/slash/index.js
function slash(path) {
  return path.startsWith("\\\\?\\") ? path : path.replace(/\\/g, "/");
}

export {
  slash
};
