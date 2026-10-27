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
  createTools
} from "../../../_node-chunks/chunk-T33LEPV7.js";
import "../../../_node-chunks/chunk-OYTIP55I.js";
import {
  ToolsRuntimeError
} from "../../../_node-chunks/chunk-RJRHGCMV.js";
import "../../../_node-chunks/chunk-XD7MO3Q4.js";
import "../../../_node-chunks/chunk-RB4S47F4.js";
import {
  serializeError
} from "../../../_node-chunks/chunk-Y7MD6E7G.js";
import "../../../_node-chunks/chunk-R2EWMRCG.js";
import "../../../_node-chunks/chunk-5KSPMDCM.js";
import "../../../_node-chunks/chunk-6W2O2EVP.js";
import "../../../_node-chunks/chunk-MXTJ3TTK.js";

// src/cli/tools/sdk/child-host.ts
import { pathToFileURL } from "node:url";
async function runChildHost({
  send = (message) => {
    process.send?.(message);
  },
  subscribe = (handler) => {
    process.on("message", handler);
  },
  cwd = () => process.cwd()
} = {}) {
  process.on("disconnect", () => {
    process.exit(0);
  }), process.env.STORYBOOK_TOOLS_CHILD_HOST = "true";
  let tools, controllers = /* @__PURE__ */ new Map(), handle = async (raw) => {
    let message = raw;
    switch (message.type) {
      case "init": {
        tools = await createTools({
          ...message.options,
          cwd: cwd(),
          mode: message.options.mode ?? "attached",
          autoSpawn: !1
        }), send({
          type: "hello",
          version: 1,
          storybook: tools.storybook,
          clientInfo: tools.clientInfo
        });
        return;
      }
      case "describe": {
        await reply(message.id, tools, () => tools.describe(message.options));
        return;
      }
      case "call": {
        let controller = new AbortController();
        controllers.set(message.id, controller);
        try {
          await reply(
            message.id,
            tools,
            () => tools.call(message.ref, message.input, { signal: controller.signal })
          );
        } finally {
          controllers.delete(message.id);
        }
        return;
      }
      case "cancel": {
        controllers.get(message.id)?.abort();
        return;
      }
      case "close": {
        await tools?.close(), process.exit(0);
        return;
      }
      default:
        throw message;
    }
  };
  async function reply(id, host, run) {
    if (!host) {
      send({
        type: "error",
        id,
        error: serializeError(
          new ToolsRuntimeError({
            reason: "command-unhandled",
            message: "The child host has not been initialized."
          })
        )
      });
      return;
    }
    try {
      send({ type: "result", id, value: await run() });
    } catch (error) {
      send({ type: "error", id, error: serializeError(error) });
    }
  }
  subscribe((message) => {
    handle(message).catch((error) => {
      let fallbackId = typeof message == "object" && message !== null && "id" in message && typeof message.id == "string" ? message.id : "init";
      send({ type: "error", id: fallbackId, error: serializeError(error) });
    });
  });
}
function isExecutedAsEntry() {
  let entry = process.argv[1];
  if (!entry)
    return !1;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return !1;
  }
}
isExecutedAsEntry() && runChildHost();
export {
  runChildHost
};
