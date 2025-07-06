import { execa } from "execa";
import path from "path";
import fs from "fs-extra";
import { UserOptions } from "./prompts.js";
import { customizeApps, addCustomApps, updateTurboConfig, updateWorkspacePackageJson, configureAllAppPorts, setupTailwindCSS, fixTypeScriptConfigPackage, createLandingPages } from "./util.js";

// Helper function to count workspace projects
function getWorkspaceCount(opts: UserOptions): number {
  let count = 1; // Always have root workspace
  
  // Apps
  count += 1; // web app
  if (opts.includeDocs) count += 1;
  if (opts.httpServer) count += 1;
  if (opts.includeWS) count += 1;
  
  // Packages
  count += 2; // eslint-config, typescript-config
  if (opts.includeTailwind) {
    count += 2; // ui, tailwind-config
  }
  
  return count;
}

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
  await execa(
    "npx",
    [
      "create-turbo@latest",
      ".",
      "--package-manager",
      pmFlag,
      "--skip-install",
    ],
    { stdio: "pipe" }
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

  // 10) Create beautiful landing pages
  await createLandingPages(opts);
  
  // 11) Install dependencies:
  console.log("📦 Installing dependencies...");

  // First, clean any existing node_modules and lock files to force fresh install
  await fs.remove("node_modules").catch(() => {}); // Ignore if doesn't exist
  await fs.remove("package-lock.json").catch(() => {});
  await fs.remove("yarn.lock").catch(() => {});
  await fs.remove("pnpm-lock.yaml").catch(() => {});

  // Install with workspace detection (suppress output)
  if (pmFlag === "pnpm") {
    await execa("pnpm", ["install", "--recursive"], { stdio: "pipe" });
  } else if (pmFlag === "yarn") {
    await execa("yarn", ["install"], { stdio: "pipe" });
  } else {
    await execa("npm", ["install"], { stdio: "pipe" });
  }

  // Final success message with helpful instructions
  console.log(`\n✅ Project initialized: ${opts.projectName}\n`);
  
  // Show selected stack
  console.log(`📦 Selected stack:`);
  console.log(`   • Frontend:        ${opts.frontend === 'web-next' ? 'Next.js' : 'Vite + React'}`);
  if (opts.includeDocs) {
    console.log(`   • Docs:            Yes (Next.js)`);
  }
  if (opts.httpServer) {
    console.log(`   • HTTP Server:     ${opts.httpServer === 'http-express' ? 'Express' : 'Fastify'}`);
  }
  if (opts.includeWS) {
    console.log(`   • WebSocket:       Enabled`);
  }
  if (opts.includeTailwind) {
    console.log(`   • Tailwind CSS:    Shared config`);
  }
  console.log(`   • Package Manager: ${pmFlag}\n`);
  
  // Show created structure
  console.log(`📁 Apps created:`);
  console.log(`   - apps/web`);
  if (opts.includeDocs) {
    console.log(`   - apps/docs`);
  }
  if (opts.httpServer) {
    console.log(`   - apps/http-server`);
  }
  if (opts.includeWS) {
    console.log(`   - apps/ws-server`);
  }
  console.log(``);
  
  console.log(`📦 Packages created:`);
  if (opts.includeTailwind) {
    console.log(`   - packages/ui`);
    console.log(`   - packages/tailwind-config`);
  }
  console.log(`   - packages/eslint-config`);
  console.log(`   - packages/typescript-config\n`);
  
  // Show port configuration
  console.log(`⚙️  Configuring development environment...`);
  console.log(`   • Ports assigned:`);
  console.log(`     → Web:         http://localhost:3000`);
  if (opts.includeDocs) {
    console.log(`     → Docs:        http://localhost:3002`);
  }
  if (opts.httpServer) {
    console.log(`     → API Server:  http://localhost:8000`);
  }
  if (opts.includeWS) {
    console.log(`     → WebSocket:   ws://localhost:8080`);
  }
  console.log(``);
  
  // Show completion status
  if (opts.includeTailwind) {
    console.log(`🎨 Tailwind CSS setup complete (shared design system)`);
  }
  if (opts.httpServer || opts.includeWS) {
    console.log(`🛠️  Server components added`);
  }
  console.log(`📝 Landing pages created`);
  console.log(`📥 Installing dependencies (${getWorkspaceCount(opts)} workspace projects)...\n`);
  
  // Optional remote caching info
  if (pmFlag === "pnpm") {
    console.log(`🔗 Remote caching (optional):`);
    console.log(`   pnpm dlx turbo login`);
    console.log(`   → Docs: https://turborepo.com/remote-cache\n`);
  }
  
  // Final success
  console.log(`✅ Setup complete! Your DevHub is ready.\n`);
  
  console.log(`📌 Next steps:`);
  console.log(`   cd ${opts.projectName}`);
  console.log(`   ${pmFlag} run dev\n`);
  
  console.log(`🚀 Start building:`);
  console.log(`   → Web App:        http://localhost:3000`);
  if (opts.includeDocs) {
    console.log(`   → Docs Site:      http://localhost:3002`);
  }
  if (opts.httpServer) {
    console.log(`   → API Server:     http://localhost:8000`);
  }
  if (opts.includeWS) {
    console.log(`   → WebSocket:      ws://localhost:8080`);
  }
  
  console.log(`\n✨ Happy coding!`);
}
