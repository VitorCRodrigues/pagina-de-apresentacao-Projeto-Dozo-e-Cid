import CJS_COMPAT_NODE_URL_383trhvngph from 'node:url';
import CJS_COMPAT_NODE_PATH_383trhvngph from 'node:path';
import CJS_COMPAT_NODE_MODULE_383trhvngph from "node:module";

var __filename = CJS_COMPAT_NODE_URL_383trhvngph.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_383trhvngph.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_383trhvngph.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------

// src/cli/skills/content/setup-utils/docs-markdown-url.ts
function getDocsMarkdownUrl(path, projectInfo) {
  let { majorVersion, renderer = "react", language = "ts" } = projectInfo ?? {}, versionSegment = majorVersion ? `/${majorVersion}` : "", params = new URLSearchParams();
  renderer && params.set("renderer", renderer), params.set("language", language);
  let query = params.toString();
  return `https://storybook.js.org/docs${versionSegment}/${path}.md${query ? `?${query}` : ""}`;
}

export {
  getDocsMarkdownUrl
};
