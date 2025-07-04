import { execa } from "execa";
import path from "path";
import fs from "fs-extra";
import { UserOptions } from "./prompts.js";
import { customizeApps, addCustomApps, updateTurboConfig, updateWorkspacePackageJson, configureAllAppPorts, setupTailwindCSS, fixTypeScriptConfigPackage } from "./util.js";

export async function runGenerator(userOptions: UserOptions) {
  const opts = userOptions;
  const pmFlag = ["npm", "yarn", "pnpm", "bun"].includes(opts.packageManager)
    ? opts.packageManager
    : "npm";

  // 1. create and cd into the project directory
  const projectDir = path.resolve(process.cwd(), opts.projectName);

  // Check if directory exists and has files
  if (await fs.pathExists(projectDir)) {
    const files = await fs.readdir(projectDir);
    if (files.length > 0) {
      console.log(`❌ Directory '${opts.projectName}' already exists and is not empty.`);
      console.log('Please choose a different project name or remove the existing directory.');
      process.exit(1);
    }
  }

  await fs.ensureDir(projectDir);
  process.chdir(projectDir);
  
  // 2. Bootstrap with the official turborepo starter
  console.log("⏳ Creating a new monorepo...");
  await execa(
    "npx",
    [
      "create-turbo@latest",
      ".",
      "--package-manager",
      pmFlag,
      "--skip-install",
    ],
    { stdio: "inherit" }
  );

  // 3) Modify or remove default apps based on user choices
  await customizeApps(opts);
  
  // 4) Configure all app ports to avoid conflicts
  await configureAllAppPorts(opts);
  
  // 5) Add additional apps based on user choices
  await addCustomApps(opts);
  
  // 6) Update Turbo configuration for new apps
  await updateTurboConfig(opts);
  
  // 7) Update workspace package.json for ES modules
  await updateWorkspacePackageJson();
  
  // 8) Fix TypeScript config package for pnpm compatibility
  await fixTypeScriptConfigPackage();
  
  // 9) Setup Tailwind CSS if requested
  if (opts.includeTailwind) {
    await setupTailwindCSS(opts);
  }
  
  // 10) Install dependencies:
  console.log("⏳ Installing dependencies…");

  // First, clean any existing node_modules and lock files to force fresh install
  await fs.remove("node_modules").catch(() => {}); // Ignore if doesn't exist
  await fs.remove("package-lock.json").catch(() => {});
  await fs.remove("yarn.lock").catch(() => {});
  await fs.remove("pnpm-lock.yaml").catch(() => {});

  // Install with workspace detection
  if (pmFlag === "pnpm") {
    await execa("pnpm", ["install", "--recursive"], { stdio: "inherit" });
  } else if (pmFlag === "yarn") {
    await execa("yarn", ["install"], { stdio: "inherit" });
  } else {
    await execa("npm", ["install"], { stdio: "inherit" });
  }

  // Final success message with helpful instructions
  console.log(`✅ Project setup complete!\n`);
  console.log(`🎉 Your dev hub is ready!\n`);
  
  if (opts.includeTailwind) {
    console.log(`🎨 Tailwind CSS configured with shared configuration:`);
    console.log(`  → Shared config: packages/tailwind-config/`);
    console.log(`  → Shared UI components: packages/ui/`);
    console.log(`  → Ready to use utility classes across all apps\n`);
  }
  
  console.log(`To get started:`);
  console.log(`  cd ${opts.projectName}`);
  console.log(`  ${pmFlag} run dev\n`);
  
  if (pmFlag === "npm") {
    console.log(`📝 Note: Since you're using npm with a monorepo:`);
    console.log(`  → Run commands from the root: npm run dev`);
    console.log(`  → To run specific apps: npm run dev --workspace=apps/web`);
    console.log(`  → For better monorepo support, consider using pnpm or yarn\n`);
  }
  
  console.log(`🚀 Happy coding!`);
}
