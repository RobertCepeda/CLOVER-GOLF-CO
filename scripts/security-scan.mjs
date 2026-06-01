import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const lifecycleScripts = new Set([
  "preinstall",
  "install",
  "postinstall",
  "prepack",
  "prepare",
  "postpack",
]);
const discouragedFiles = [
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
];

const exists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const readPackage = async () => {
  try {
    return JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  } catch {
    return {};
  }
};

const findings = [];
const packageJson = await readPackage();

Object.keys(packageJson.scripts || {}).forEach((scriptName) => {
  if (lifecycleScripts.has(scriptName)) {
    findings.push(`Lifecycle script blocked for review: ${scriptName}`);
  }
});

for (const fileName of discouragedFiles) {
  if (await exists(join(root, fileName))) {
    findings.push(`Unexpected npm/yarn artifact found: ${fileName}`);
  }
}

if (findings.length) {
  console.error("Security scan found items to review:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log("Security scan passed: no lifecycle install scripts or npm/yarn artifacts found.");
}
