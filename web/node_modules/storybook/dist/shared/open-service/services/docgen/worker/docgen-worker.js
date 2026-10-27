import CJS_COMPAT_NODE_URL_383trhvngph from 'node:url';
import CJS_COMPAT_NODE_PATH_383trhvngph from 'node:path';
import CJS_COMPAT_NODE_MODULE_383trhvngph from "node:module";

var __filename = CJS_COMPAT_NODE_URL_383trhvngph.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_383trhvngph.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_383trhvngph.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  errorToErrorLike
} from "../../../../../_node-chunks/chunk-KLWDOCPD.js";
import "../../../../../_node-chunks/chunk-WSJCQAYF.js";
import "../../../../../_node-chunks/chunk-EIWY5QCH.js";
import "../../../../../_node-chunks/chunk-MXTJ3TTK.js";

// src/shared/open-service/services/docgen/worker/docgen-worker.ts
import { parentPort } from "node:worker_threads";
import { pathToFileURL } from "node:url";
import { logger } from "storybook/internal/node-logger";
if (!parentPort)
  throw new Error("docgen worker must be run as a worker thread");
var port = parentPort, seedProvider = async () => {
}, providerPromise;
async function composeProvider(descriptors) {
  let provider = seedProvider;
  for (let descriptor of descriptors) {
    let mod = await import(pathToFileURL(descriptor.moduleSpecifier).href);
    if (typeof mod.createDocgenProvider != "function")
      throw new Error(
        `docgen worker module "${descriptor.moduleSpecifier}" does not export createDocgenProvider`
      );
    provider = (await mod.createDocgenProvider(descriptor.options))(provider);
  }
  return provider;
}
async function handleInit({ descriptors, logLevel }) {
  try {
    logger.setLogLevel(logLevel), providerPromise = composeProvider(descriptors), await providerPromise, port.postMessage({ type: "init" });
  } catch (error) {
    providerPromise = void 0, port.postMessage({
      type: "init",
      error: errorToErrorLike(error)
    });
  }
}
async function handleExtract(id, entry) {
  try {
    if (!providerPromise)
      throw new Error("docgen worker received an extract request before init");
    let payload = await (await providerPromise)({ entry });
    port.postMessage({ type: "extract", id, payload });
  } catch (error) {
    port.postMessage({
      type: "extract",
      id,
      error: errorToErrorLike(error)
    });
  }
}
port.on("message", (msg) => {
  switch (msg.type) {
    case "init":
      handleInit(msg);
      return;
    case "extract":
      handleExtract(msg.id, msg.entry);
      return;
    default: {
      let _exhaustive = msg;
      throw new Error(`docgen worker received unknown message: ${JSON.stringify(_exhaustive)}`);
    }
  }
});
