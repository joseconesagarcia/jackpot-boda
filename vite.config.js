import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

function copyQuestionsJson() {
  return {
    name: "copy-questions-json",
    writeBundle() {
      const source = resolve(rootDir, "src/questions.json");
      const target = resolve(rootDir, "dist/src/questions.json");

      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(source, target);
    },
  };
}

export default defineConfig({
  base: "/jackpot-boda/",
  plugins: [copyQuestionsJson()],
});
