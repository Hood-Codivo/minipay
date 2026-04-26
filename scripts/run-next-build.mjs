import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));
const requestedDistDir = process.env.NEXT_DIST_DIR?.trim() || ".next";
let distDirName = requestedDistDir;

try {
  await fs.rm(path.resolve(workspaceRoot, distDirName), {
    recursive: true,
    force: true,
  });
} catch (error) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "EPERM"
  ) {
    distDirName = path.join(
      "..",
      `.next-frontend-out-${Date.now().toString(36)}`,
    );
  } else {
    throw error;
  }
}

const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "build", "--webpack"], {
  cwd: workspaceRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_DIST_DIR: distDirName,
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
