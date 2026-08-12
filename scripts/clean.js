// Removes the `dist` build output folder.
//
// On Windows, transient locks (antivirus scans, an open Explorer window) can
// briefly block deletion. Retry a few times, but never fail the build over it:
// if `dist` is still locked, warn and continue — tsc will simply overwrite the
// files it emits.
const fs = require("fs");
const path = require("path");

const dist = path.join(__dirname, "..", "dist");

function remove() {
  try {
    fs.rmSync(dist, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

if (remove()) {
  process.exit(0);
}

for (let attempt = 1; attempt <= 5; attempt++) {
  const waitMs = 400 * attempt;
  console.warn(`dist is temporarily locked, retrying in ${waitMs}ms (attempt ${attempt}/5)...`);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
  if (remove()) {
    process.exit(0);
  }
}

console.warn(
  "WARNING: could not fully remove dist (files are locked). Continuing anyway — " +
    "tsc will overwrite its output. If the build fails, stop the running bot first.",
);
