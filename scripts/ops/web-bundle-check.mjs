#!/usr/bin/env node

import { gzipSync } from "node:zlib";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../..");
const assetsDir = path.resolve(repoRoot, process.env.OPS_BUNDLE_ASSETS_DIR ?? "apps/web/dist/assets");
const reportPath = path.resolve(repoRoot, process.env.OPS_BUNDLE_REPORT_PATH ?? "apps/web/dist/bundle-report.json");
const warnLimitKb = parseNumber(process.env.OPS_BUNDLE_WARN_LIMIT_KB, 500);
const failLimitKb = parseOptionalNumber(process.env.OPS_BUNDLE_FAIL_LIMIT_KB);

const entries = await readdir(assetsDir, { withFileTypes: true }).catch(() => []);
const assetFiles = entries.filter((entry) => entry.isFile());

if (!assetFiles.length) {
  console.error(`[ops-bundle] No built assets found in ${assetsDir}. Run the web build first.`);
  process.exit(1);
}

const assets = [];

for (const entry of assetFiles) {
  const absolutePath = path.join(assetsDir, entry.name);
  const fileStat = await stat(absolutePath);
  const contents = await readFile(absolutePath);
  const gzipBytes = gzipSync(contents).byteLength;
  const type = detectAssetType(entry.name);

  assets.push({
    file: entry.name,
    type,
    rawBytes: fileStat.size,
    gzipBytes
  });
}

assets.sort((left, right) => right.rawBytes - left.rawBytes);

const jsAssets = assets.filter((asset) => asset.type === "js");
const cssAssets = assets.filter((asset) => asset.type === "css");
const largestJs = jsAssets[0] ?? null;
const largestCss = cssAssets[0] ?? null;
const totalRawBytes = assets.reduce((sum, asset) => sum + asset.rawBytes, 0);
const totalGzipBytes = assets.reduce((sum, asset) => sum + asset.gzipBytes, 0);

const report = {
  generatedAt: new Date().toISOString(),
  assetsDir: path.relative(repoRoot, assetsDir),
  warnLimitKb,
  failLimitKb,
  totals: {
    assetCount: assets.length,
    totalRawKb: roundKb(totalRawBytes),
    totalGzipKb: roundKb(totalGzipBytes)
  },
  largestJs: largestJs ? summarize(largestJs) : null,
  largestCss: largestCss ? summarize(largestCss) : null,
  topAssets: assets.slice(0, 10).map(summarize)
};

await writeFile(reportPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));

if (largestJs && roundKb(largestJs.rawBytes) > warnLimitKb) {
  console.warn(
    `[ops-bundle] Warning: largest JS asset ${largestJs.file} is ${roundKb(largestJs.rawBytes)} kB (warn limit ${warnLimitKb} kB).`
  );
}

if (largestJs && failLimitKb !== null && roundKb(largestJs.rawBytes) > failLimitKb) {
  console.error(
    `[ops-bundle] Failure: largest JS asset ${largestJs.file} is ${roundKb(largestJs.rawBytes)} kB (fail limit ${failLimitKb} kB).`
  );
  process.exit(1);
}

function detectAssetType(fileName) {
  if (fileName.endsWith(".js")) return "js";
  if (fileName.endsWith(".css")) return "css";
  if (fileName.endsWith(".html")) return "html";
  return "other";
}

function summarize(asset) {
  return {
    file: asset.file,
    type: asset.type,
    rawKb: roundKb(asset.rawBytes),
    gzipKb: roundKb(asset.gzipBytes)
  };
}

function roundKb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalNumber(value) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
