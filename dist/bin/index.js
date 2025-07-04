#!/usr/bin/env node
import { askUserOptions } from "../core/prompts.js";
import { runGenerator } from "../core/generator.js";
console.log('🐣 create‑devhub starting…');
async function run() {
    const opts = await askUserOptions();
    await runGenerator(opts);
}
run();
