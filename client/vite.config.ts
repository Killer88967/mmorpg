import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Vite does not read tsconfig `paths`, so mirror them here.
// Order matters: most specific alias first.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/server\/schema\//, replacement: r("../server/src/rooms/schema/") },
      { find: /^@\/server\//, replacement: r("../server/src/") },
      { find: /^@\//, replacement: r("./src/") },
    ],
  },
});
