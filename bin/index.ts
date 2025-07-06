import { askUserOptions } from "../core/prompts.js";
import { runGenerator } from "../core/generator.js";

console.log('� create-devhub\n');

async function run() {
  const opts = await askUserOptions();
  await runGenerator(opts);
}

run();
