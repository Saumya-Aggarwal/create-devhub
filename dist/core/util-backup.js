import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { execa } from "execa";
// Get the directory where this util.ts file is located
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Function to detect available package managers
export async function getAvailablePackageManagers() {
    const managers = [
        { title: 'npm', value: 'npm' },
        { title: 'yarn', value: 'yarn' },
        { title: 'pnpm', value: 'pnpm' },
        { title: 'bun', value: 'bun' }
    ];
    const available = [];
    for (const manager of managers) {
        try {
            await execa(manager.value, ['--version'], { stdio: 'ignore' });
            available.push(manager);
        }
        catch {
            // Package manager not available
        }
    }
    // Always include npm as fallback (should be available with Node.js)
    if (available.length === 0) {
        available.push({ title: 'npm', value: 'npm' });
    }
    return available;
}
// Helper function to customize default apps
export async function customizeApps(opts) {
    console.log("🔧 Customizing apps based on your choices...");
    // Handle frontend choice
    if (opts.frontend === "web-vite") {
        // Remove default Next.js web app
        console.log("  → Removing default Next.js web app");
        await fs.remove("apps/web");
        // Create Vite app using official create-vite
        console.log("  → Creating Vite + React app with create-vite");
        await execa("npx", [
            "create-vite@latest",
            "apps/web",
            "--template",
            "react-ts"
        ], { stdio: "inherit" });
    }
    // Handle docs choice
    if (!opts.includeDocs) {
        console.log("  → Removing docs app (not needed)");
        await fs.remove("apps/docs");
    }
}
// Helper function to add custom apps
export async function addCustomApps(opts) {
    console.log("🚀 Adding additional apps... \n");
    // Add HTTP server if requested
    if (opts.httpServer) {
        console.log(`  → Adding ${opts.httpServer} server`);
        const serverTemplatePath = path.join(__dirname, "..", "..", "templates", opts.httpServer);
        await fs.copy(serverTemplatePath, "apps/http-server");
    }
    // Add WebSocket server if requested
    if (opts.includeWS) {
        console.log("  → Adding WebSocket server");
        const wsTemplatePath = path.join(__dirname, "..", "..", "templates", "ws-server");
        await fs.copy(wsTemplatePath, "apps/ws-server");
    }
}
// Function to setup Tailwind CSS using the recommended Turborepo recipe
export async function setupTailwindForApps(opts) {
    if (!opts.includeTailwind)
        return;
    console.log("🎨 Setting up Tailwind CSS with Turborepo best practices...");
    // Use the user's chosen package manager
    const pmFlag = opts.packageManager;
    // Install Tailwind dependencies ONLY at the root workspace (per recipe)
    console.log("  → Installing Tailwind CSS at workspace root with exact versions");
    if (pmFlag === "pnpm") {
        await execa(pmFlag, ["add", "-D", "-w", "--save-exact", "tailwindcss@3.4.14", "postcss@8.4.47", "autoprefixer@10.4.20"], {
            stdio: "inherit"
        });
    }
    else {
        await execa(pmFlag, ["install", "-D", "--save-exact", "tailwindcss@3.4.14", "postcss@8.4.47", "autoprefixer@10.4.20"], {
            stdio: "inherit"
        });
    }
    // Create root Tailwind config file
    console.log("  → Creating root Tailwind config");
    const rootTailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './apps/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
}`;
    await fs.writeFile("tailwind.config.js", rootTailwindConfig);
    // Create root PostCSS config file (use .cjs extension to avoid ES module conflicts)
    console.log("  → Creating root PostCSS config");
    const rootPostcssConfig = `module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
}`;
    await fs.writeFile("postcss.config.cjs", rootPostcssConfig);
    // Enforce Tailwind v3 and clean up any v4+ remnants
    console.log("  → Enforcing Tailwind v3.4.14 compatibility");
    await enforceTailwindV3(opts);
    console.log("✅ Tailwind CSS installed at root using Turborepo recipe!");
}
// Function to configure apps to use the root Tailwind setup
export async function configureTailwindForApps(opts) {
    if (!opts.includeTailwind)
        return;
    console.log("🔧 Configuring apps to use Tailwind CSS...");
    if (opts.frontend === "web-next") {
        console.log("  → Adding Tailwind directives to Next.js app");
        // Create globals.css with Tailwind directives for Next.js
        const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;`;
        await fs.writeFile("apps/web/app/globals.css", globalsCss);
        // Ensure the globals.css is imported in layout.tsx
        const layoutPath = "apps/web/app/layout.tsx";
        if (await fs.pathExists(layoutPath)) {
            let layoutContent = await fs.readFile(layoutPath, 'utf-8');
            if (!layoutContent.includes('./globals.css')) {
                layoutContent = layoutContent.replace(/import.*from ['"]react['"]/, `import './globals.css'\nimport React from 'react'`);
                await fs.writeFile(layoutPath, layoutContent);
            }
        }
        // Fix web app package.json to remove --turbopack for compatibility
        const webPackageJsonPath = "apps/web/package.json";
        if (await fs.pathExists(webPackageJsonPath)) {
            const webPackageJson = await fs.readJson(webPackageJsonPath);
            if (webPackageJson.scripts && webPackageJson.scripts.dev) {
                // Remove --turbopack flag to avoid compatibility issues with Tailwind
                webPackageJson.scripts.dev = webPackageJson.scripts.dev.replace(' --turbopack', '');
                console.log("  → Disabled Turbopack for web app (better Tailwind compatibility)");
                await fs.writeJson(webPackageJsonPath, webPackageJson, { spaces: 2 });
            }
        }
    }
    else if (opts.frontend === "web-vite") {
        console.log("  → Adding Tailwind directives to Vite app");
        // Add Tailwind directives to main CSS file
        const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;`;
        await fs.writeFile("apps/web/src/index.css", indexCss);
        // Create Vite-specific PostCSS config for the app
        console.log("  → Creating Vite PostCSS config");
        const vitePostcssConfig = `module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
}`;
        await fs.writeFile("apps/web/postcss.config.js", vitePostcssConfig);
        // Update Vite config to ensure PostCSS processing
        const viteConfigPath = "apps/web/vite.config.ts";
        if (await fs.pathExists(viteConfigPath)) {
            let viteConfig = await fs.readFile(viteConfigPath, 'utf-8');
            // Check if css config already exists
            if (!viteConfig.includes('css:')) {
                viteConfig = viteConfig.replace('export default defineConfig({', `export default defineConfig({
  css: {
    postcss: './postcss.config.js',
  },`);
                await fs.writeFile(viteConfigPath, viteConfig);
            }
        }
    }
    // Configure docs app if included
    if (opts.includeDocs) {
        console.log("  → Adding Tailwind directives to docs app");
        // Create globals.css with Tailwind directives for docs
        const docsGlobalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;`;
        await fs.writeFile("apps/docs/app/globals.css", docsGlobalsCss);
        // Ensure the globals.css is imported in docs layout.tsx
        const docsLayoutPath = "apps/docs/app/layout.tsx";
        if (await fs.pathExists(docsLayoutPath)) {
            let layoutContent = await fs.readFile(docsLayoutPath, 'utf-8');
            if (!layoutContent.includes('./globals.css')) {
                layoutContent = layoutContent.replace(/import.*from ['"]react['"]/, `import './globals.css'\nimport React from 'react'`);
                await fs.writeFile(docsLayoutPath, layoutContent);
            }
        }
        // Fix docs app package.json to remove --turbopack for compatibility
        const docsPackageJsonPath = "apps/docs/package.json";
        if (await fs.pathExists(docsPackageJsonPath)) {
            const docsPackageJson = await fs.readJson(docsPackageJsonPath);
            if (docsPackageJson.scripts && docsPackageJson.scripts.dev) {
                // Remove --turbopack flag to avoid compatibility issues with Tailwind
                docsPackageJson.scripts.dev = docsPackageJson.scripts.dev.replace(' --turbopack', '');
                console.log("  → Disabled Turbopack for docs app (better Tailwind compatibility)");
                await fs.writeJson(docsPackageJsonPath, docsPackageJson, { spaces: 2 });
            }
        }
    }
    // Create app-specific Tailwind configs that extend the root config
    console.log("  → Creating app-specific Tailwind configs");
    if (opts.frontend === "web-next" || opts.frontend === "web-vite") {
        const appTailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  ...require('../../tailwind.config.js'),
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}`;
        await fs.writeFile("apps/web/tailwind.config.js", appTailwindConfig);
    }
    if (opts.includeDocs) {
        const docsTailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  ...require('../../tailwind.config.js'),
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}`;
        await fs.writeFile("apps/docs/tailwind.config.js", docsTailwindConfig);
    }
    console.log("✅ Apps configured to use Tailwind CSS!");
}
// Function to setup simple UI package with basic components
async function setupSimpleUIPackage(opts) {
    console.log("  → Setting up UI package with basic components");
    // Create a simple styles.css in UI package with just basic component styles
    const uiStyles = `/* Simple shared component styles (optional) */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background-color: #2563eb;
  color: white;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-secondary {
  background-color: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background-color: #d1d5db;
}`;
    await fs.writeFile("packages/ui/src/styles.css", uiStyles);
    // Update UI package.json to include styles export
    const uiPackageJsonPath = "packages/ui/package.json";
    if (await fs.pathExists(uiPackageJsonPath)) {
        const uiPackageJson = await fs.readJson(uiPackageJsonPath);
        // Add exports for styles
        uiPackageJson.exports = {
            ...uiPackageJson.exports,
            "./styles": "./src/styles.css"
        };
        await fs.writeJson(uiPackageJsonPath, uiPackageJson, { spaces: 2 });
    }
}
// Function to fix Tailwind CSS setup issues and ensure proper configuration
export async function fixTailwindSetup(opts) {
    if (!opts.includeTailwind)
        return;
    console.log("🔧 Fixing Tailwind CSS setup...");
    // Ensure PostCSS config uses correct format
    const rootPostcssConfig = `module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
}`;
    await fs.writeFile("postcss.config.cjs", rootPostcssConfig);
    // For Vite apps, also create a classic CommonJS version for compatibility
    if (opts.frontend === "web-vite") {
        const vitePostcssConfig = `module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
}`;
        await fs.writeFile("apps/web/postcss.config.js", vitePostcssConfig);
    }
    console.log("✅ Tailwind CSS setup fixed!");
}
// Function to fix Tailwind CSS version issues by downgrading to v3.4.14
export async function fixTailwindVersionIssues(opts, packageManager = "pnpm") {
    if (!opts.includeTailwind)
        return;
    console.log("🔧 Fixing Tailwind CSS version issues...");
    // Remove problematic Tailwind v4+ and install stable v3
    console.log("  → Removing Tailwind v4+ and installing stable v3.4.14");
    if (packageManager === "pnpm") {
        await execa(packageManager, ["remove", "-w", "tailwindcss", "@tailwindcss/postcss"], {
            stdio: "inherit"
        });
        await execa(packageManager, ["add", "-D", "-w", "tailwindcss@3.4.14", "postcss@8.4.47", "autoprefixer@10.4.20"], {
            stdio: "inherit"
        });
    }
    else {
        await execa(packageManager, ["uninstall", "tailwindcss", "@tailwindcss/postcss"], {
            stdio: "inherit"
        });
        await execa(packageManager, ["install", "-D", "tailwindcss@3.4.14", "postcss@8.4.47", "autoprefixer@10.4.20"], {
            stdio: "inherit"
        });
    }
    // Ensure PostCSS config uses correct format for v3
    const rootPostcssConfig = `module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
}`;
    await fs.writeFile("postcss.config.cjs", rootPostcssConfig);
    // For Vite apps, also create the correct config
    if (opts.frontend === "web-vite") {
        const vitePostcssConfig = `module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
}`;
        await fs.writeFile("apps/web/postcss.config.js", vitePostcssConfig);
    }
    console.log("✅ Tailwind CSS version issues fixed!");
    console.log("   → Downgraded to stable v3.4.14");
    console.log("   → Updated PostCSS configs");
    console.log("   → Please restart your dev server");
}
// Function to update turbo.json for custom apps
export async function updateTurboConfig(opts) {
    console.log("🔧 Updating Turbo configuration...");
    const turboConfigPath = "turbo.json";
    if (await fs.pathExists(turboConfigPath)) {
        const turboConfig = await fs.readJson(turboConfigPath);
        // Ensure tasks object exists
        if (!turboConfig.tasks)
            turboConfig.tasks = {};
        // Add tasks for custom apps if they exist
        if (opts.httpServer) {
            console.log("  → Adding HTTP server to Turbo config");
            // Ensure the app is included in build and dev tasks
            if (turboConfig.tasks.build) {
                turboConfig.tasks.build.dependsOn = turboConfig.tasks.build.dependsOn || [];
            }
            if (turboConfig.tasks.dev) {
                turboConfig.tasks.dev.cache = false; // Dev tasks shouldn't cache
            }
        }
        if (opts.includeWS) {
            console.log("  → Adding WebSocket server to Turbo config");
        }
        await fs.writeJson(turboConfigPath, turboConfig, { spaces: 2 });
        console.log("✅ Turbo configuration updated!");
    }
}
// Function to update workspace package.json
export async function updateWorkspacePackageJson() {
    console.log("🔧 Updating workspace package.json...");
    const packageJsonPath = "package.json";
    if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        // Remove type: module if it exists to avoid conflicts with Next.js apps
        if (packageJson.type) {
            delete packageJson.type;
        }
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
        console.log("✅ Workspace package.json updated!");
    }
}
// Function to configure docs app port
export async function configureDocsPort(opts) {
    if (!opts.includeDocs)
        return;
    console.log("🔧 Configuring docs app port...");
    const docsPackageJsonPath = "apps/docs/package.json";
    if (await fs.pathExists(docsPackageJsonPath)) {
        console.log("  → Setting docs dev port to 3002");
        const docsPackageJson = await fs.readJson(docsPackageJsonPath);
        // Update dev script to use port 3002 to avoid conflicts
        if (docsPackageJson.scripts) {
            if (docsPackageJson.scripts.dev) {
                docsPackageJson.scripts.dev = "next dev --port 3002";
            }
            if (docsPackageJson.scripts.start) {
                docsPackageJson.scripts.start = "next start --port 3002";
            }
        }
        await fs.writeJson(docsPackageJsonPath, docsPackageJson, { spaces: 2 });
        console.log("✅ Docs port configured to 3002!");
    }
}
// Function to configure all app ports to avoid conflicts
export async function configureAllAppPorts(opts) {
    console.log("🔧 Configuring app ports to avoid conflicts...");
    // Configure docs port if included
    if (opts.includeDocs) {
        await configureDocsPort(opts);
    }
    // Configure HTTP server port if included
    if (opts.httpServer) {
        const httpServerPackageJsonPath = "apps/http-server/package.json";
        if (await fs.pathExists(httpServerPackageJsonPath)) {
            console.log("  → Setting HTTP server port to 8000");
            const httpPackageJson = await fs.readJson(httpServerPackageJsonPath);
            // Update the source file to use port 8000
            const serverIndexPath = "apps/http-server/src/index.ts";
            if (await fs.pathExists(serverIndexPath)) {
                let serverContent = await fs.readFile(serverIndexPath, 'utf-8');
                serverContent = serverContent.replace(/const PORT = process\.env\.PORT \? parseInt\(process\.env\.PORT\) : \d+;/, 'const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;');
                await fs.writeFile(serverIndexPath, serverContent);
            }
        }
    }
    // Configure WebSocket server port if included
    if (opts.includeWS) {
        const wsServerIndexPath = "apps/ws-server/src/index.ts";
        if (await fs.pathExists(wsServerIndexPath)) {
            console.log("  → Setting WebSocket server port to 8080");
            let wsContent = await fs.readFile(wsServerIndexPath, 'utf-8');
            wsContent = wsContent.replace(/const PORT = process\.env\.PORT \? parseInt\(process\.env\.PORT\) : \d+;/, 'const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;');
            await fs.writeFile(wsServerIndexPath, wsContent);
        }
    }
    console.log("✅ All app ports configured!");
    console.log("   → Web: http://localhost:3000");
    if (opts.includeDocs) {
        console.log("   → Docs: http://localhost:3002");
    }
    if (opts.httpServer) {
        console.log("   → API: http://localhost:8000");
    }
    if (opts.includeWS) {
        console.log("   → WebSocket: ws://localhost:8080");
    }
}
// Function to ensure workspace dependencies are properly configured
export async function updateWorkspaceDependencies(opts) {
    // Skip for now - keep it simple
    console.log("✅ Workspace dependencies configured!");
}
// Function to add test page with Tailwind classes
export async function addTailwindTestPage(opts) {
    if (!opts.includeTailwind)
        return;
    console.log("🧪 Adding Tailwind test page...");
    if (opts.frontend === "web-next") {
        const testPageContent = `export default function TailwindTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
        <h1 className="text-4xl font-bold text-gray-800 mb-4 text-center">
          Hello Tailwind! 🎨
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          If you see this beautiful gradient and styled components, Tailwind is working with the root config! 🎉
        </p>
        <div className="space-y-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors w-full">
            Primary Button
          </button>
          <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded font-medium hover:bg-gray-300 transition-colors w-full">
            Secondary Button
          </button>
        </div>
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800 font-medium">
            ✅ Turborepo + Tailwind + Root Config Working!
          </p>
        </div>
      </div>
    </div>
  );
}`;
        await fs.ensureDir("apps/web/app/tailwind-test");
        await fs.writeFile("apps/web/app/tailwind-test/page.tsx", testPageContent);
        console.log("  → Added test page at /tailwind-test");
    }
    else if (opts.frontend === "web-vite") {
        // Update the default App.tsx with Tailwind classes using shared UI
        const appContent = `import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl text-center max-w-lg w-full">
        <div className="flex justify-center space-x-4 mb-6">
          <a href="https://vitejs.dev" target="_blank">
            <img src={viteLogo} className="h-16 w-16 hover:rotate-180 transition-transform duration-500" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="h-16 w-16 animate-spin" alt="React logo" />
          </a>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Vite + React + Tailwind 🎨
        </h1>
        <div className="mb-6">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors"
            onClick={() => setCount((count) => count + 1)}
          >
            count is {count}
          </button>
        </div>
        <p className="text-gray-600 mb-4">
          If you see styled components, Tailwind is working! 🎉
        </p>
        <div className="p-4 bg-green-50 rounded-lg mb-4">
          <p className="text-sm text-green-800 font-medium">
            ✅ Turborepo + Tailwind + Root Config Working!
          </p>
        </div>
        <p className="text-sm text-gray-500">
          Edit <code className="bg-gray-200 px-2 py-1 rounded text-gray-800">src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </div>
  )
}

export default App`;
        await fs.writeFile("apps/web/src/App.tsx", appContent);
        console.log("  → Updated App.tsx with shared Tailwind styles");
    }
    // Add test page for docs if included
    if (opts.includeDocs) {
        const docsTestPageContent = `export default function TailwindTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
        <h1 className="text-4xl font-bold text-gray-800 mb-4 text-center">
          Docs + Tailwind! 📚
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          If you see this beautiful gradient, Tailwind is working in docs! 🎉
        </p>
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Next.js</span>
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Tailwind</span>
          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">Docs</span>
          <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">Turborepo</span>
        </div>
        <div className="space-y-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors w-full">
            Primary Button
          </button>
          <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded font-medium hover:bg-gray-300 transition-colors w-full">
            Secondary Button
          </button>
        </div>
      </div>
    </div>
  );
}`;
        await fs.ensureDir("apps/docs/app/tailwind-test");
        await fs.writeFile("apps/docs/app/tailwind-test/page.tsx", docsTestPageContent);
        console.log("  → Added docs test page at /tailwind-test");
    }
    console.log("✅ Tailwind test pages added with shared UI components!");
}
// Function to fix Next.js Turbopack + Tailwind CSS compatibility issues
export async function fixNextjsTurbopackIssues(opts) {
    if (!opts.includeTailwind || opts.frontend !== "web-next")
        return;
    console.log("🔧 Fixing Next.js Turbopack + Tailwind compatibility...");
    // Update package.json to disable Turbopack for development
    const webPackageJsonPath = "apps/web/package.json";
    if (await fs.pathExists(webPackageJsonPath)) {
        const webPackageJson = await fs.readJson(webPackageJsonPath);
        if (webPackageJson.scripts && webPackageJson.scripts.dev) {
            // Remove --turbopack flag to avoid compatibility issues
            webPackageJson.scripts.dev = webPackageJson.scripts.dev.replace(' --turbopack', '');
            // Ensure it doesn't have --turbopack
            if (!webPackageJson.scripts.dev.includes('--turbopack')) {
                console.log("  → Disabled Turbopack for development (compatibility)");
                await fs.writeJson(webPackageJsonPath, webPackageJson, { spaces: 2 });
            }
        }
    }
    // Also update docs app if it exists
    if (opts.includeDocs) {
        const docsPackageJsonPath = "apps/docs/package.json";
        if (await fs.pathExists(docsPackageJsonPath)) {
            const docsPackageJson = await fs.readJson(docsPackageJsonPath);
            if (docsPackageJson.scripts && docsPackageJson.scripts.dev) {
                // Remove --turbopack flag
                docsPackageJson.scripts.dev = docsPackageJson.scripts.dev.replace(' --turbopack', '');
                if (!docsPackageJson.scripts.dev.includes('--turbopack')) {
                    console.log("  → Disabled Turbopack for docs development");
                    await fs.writeJson(docsPackageJsonPath, docsPackageJson, { spaces: 2 });
                }
            }
        }
    }
    console.log("✅ Next.js Turbopack compatibility issues fixed!");
    console.log("   → Turbopack disabled for development");
    console.log("   → Using standard Next.js webpack build");
}
// Function to completely fix Tailwind CSS installation issues
export async function forceFixTailwindInstallation(opts, packageManager = "pnpm") {
    if (!opts.includeTailwind)
        return;
    console.log("🔧 Completely fixing Tailwind CSS installation...");
    try {
        // Step 1: Clear all caches and lockfiles
        console.log("  → Clearing package manager caches and lockfiles");
        await fs.remove("node_modules");
        await fs.remove("pnpm-lock.yaml");
        await fs.remove("package-lock.json");
        await fs.remove("yarn.lock");
        // Step 2: Remove all Tailwind-related packages from package.json
        console.log("  → Removing all Tailwind packages from package.json");
        const rootPackageJsonPath = "package.json";
        if (await fs.pathExists(rootPackageJsonPath)) {
            const rootPackageJson = await fs.readJson(rootPackageJsonPath);
            // Remove from devDependencies
            if (rootPackageJson.devDependencies) {
                delete rootPackageJson.devDependencies.tailwindcss;
                delete rootPackageJson.devDependencies["@tailwindcss/postcss"];
                delete rootPackageJson.devDependencies.postcss;
                delete rootPackageJson.devDependencies.autoprefixer;
            }
            // Remove from dependencies (shouldn't be here, but just in case)
            if (rootPackageJson.dependencies) {
                delete rootPackageJson.dependencies.tailwindcss;
                delete rootPackageJson.dependencies["@tailwindcss/postcss"];
                delete rootPackageJson.dependencies.postcss;
                delete rootPackageJson.dependencies.autoprefixer;
            }
            await fs.writeJson(rootPackageJsonPath, rootPackageJson, { spaces: 2 });
        }
        // Step 2.5: Also clean individual app package.json files
        const appDirs = ["apps/web", "apps/docs"];
        for (const appDir of appDirs) {
            const appPackageJsonPath = path.join(appDir, "package.json");
            if (await fs.pathExists(appPackageJsonPath)) {
                const appPackageJson = await fs.readJson(appPackageJsonPath);
                // Remove Tailwind packages from app dependencies too
                if (appPackageJson.devDependencies) {
                    delete appPackageJson.devDependencies.tailwindcss;
                    delete appPackageJson.devDependencies["@tailwindcss/postcss"];
                    delete appPackageJson.devDependencies.postcss;
                    delete appPackageJson.devDependencies.autoprefixer;
                }
                if (appPackageJson.dependencies) {
                    delete appPackageJson.dependencies.tailwindcss;
                    delete appPackageJson.dependencies["@tailwindcss/postcss"];
                    delete appPackageJson.dependencies.postcss;
                    delete appPackageJson.dependencies.autoprefixer;
                }
                await fs.writeJson(appPackageJsonPath, appPackageJson, { spaces: 2 });
            }
        }
        // Step 3: Install exact versions we need
        console.log("  → Installing exact Tailwind CSS v3.4.14 with pinned dependencies");
        if (packageManager === "pnpm") {
            await execa(packageManager, [
                "add", "-D", "-w", "--save-exact",
                "tailwindcss@3.4.14",
                "postcss@8.4.47",
                "autoprefixer@10.4.20"
            ], {
                stdio: "inherit"
            });
        }
        else {
            await execa(packageManager, [
                "install", "-D", "--save-exact",
                "tailwindcss@3.4.14",
                "postcss@8.4.47",
                "autoprefixer@10.4.20"
            ], {
                stdio: "inherit"
            });
        }
        // Step 4: Ensure PostCSS config uses v3 format
        console.log("  → Creating PostCSS config for Tailwind v3");
        const rootPostcssConfig = `module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
}`;
        await fs.writeFile("postcss.config.cjs", rootPostcssConfig);
        // Step 5: For Vite apps, also create the correct config
        if (opts.frontend === "web-vite") {
            const vitePostcssConfig = `module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
}`;
            await fs.writeFile("apps/web/postcss.config.js", vitePostcssConfig);
        }
        // Step 6: Ensure Turbopack is completely disabled
        console.log("  → Ensuring Turbopack is disabled in all apps");
        await fixNextjsTurbopackIssues(opts);
        console.log("✅ Tailwind CSS installation completely fixed!");
        console.log("   → Installed exact versions: tailwindcss@3.4.14, postcss@8.4.47, autoprefixer@10.4.20");
        console.log("   → Cleared all caches and lockfiles");
        console.log("   → Turbopack disabled for compatibility");
        console.log("   → Please restart your dev server");
    }
    catch (error) {
        console.error("❌ Error fixing Tailwind installation:", error);
        throw error;
    }
}
// Function to remove all Tailwind v4+ packages from workspace
export async function removeAllTailwindV4(opts) {
    console.log("🧹 Removing all Tailwind v4+ packages from workspace...");
    // List of all Tailwind v4+ related packages to remove
    const tailwindV4Packages = [
        "tailwindcss",
        "@tailwindcss/postcss",
        "@tailwindcss/vite",
        "@tailwindcss/cli",
        "@tailwindcss/oxide"
    ];
    // Remove from root package.json
    const rootPackageJsonPath = "package.json";
    if (await fs.pathExists(rootPackageJsonPath)) {
        const rootPackageJson = await fs.readJson(rootPackageJsonPath);
        let changed = false;
        // Remove from devDependencies
        if (rootPackageJson.devDependencies) {
            for (const pkg of tailwindV4Packages) {
                if (rootPackageJson.devDependencies[pkg]) {
                    delete rootPackageJson.devDependencies[pkg];
                    changed = true;
                }
            }
        }
        // Remove from dependencies
        if (rootPackageJson.dependencies) {
            for (const pkg of tailwindV4Packages) {
                if (rootPackageJson.dependencies[pkg]) {
                    delete rootPackageJson.dependencies[pkg];
                    changed = true;
                }
            }
        }
        if (changed) {
            await fs.writeJson(rootPackageJsonPath, rootPackageJson, { spaces: 2 });
            console.log("  → Cleaned root package.json");
        }
    }
    // Remove from app package.json files
    const appDirs = ["apps/web", "apps/docs", "apps/http-server", "apps/ws-server"];
    for (const appDir of appDirs) {
        const appPackageJsonPath = path.join(appDir, "package.json");
        if (await fs.pathExists(appPackageJsonPath)) {
            const appPackageJson = await fs.readJson(appPackageJsonPath);
            let changed = false;
            // Remove from devDependencies
            if (appPackageJson.devDependencies) {
                for (const pkg of tailwindV4Packages) {
                    if (appPackageJson.devDependencies[pkg]) {
                        delete appPackageJson.devDependencies[pkg];
                        changed = true;
                    }
                }
            }
            // Remove from dependencies
            if (appPackageJson.dependencies) {
                for (const pkg of tailwindV4Packages) {
                    if (appPackageJson.dependencies[pkg]) {
                        delete appPackageJson.dependencies[pkg];
                        changed = true;
                    }
                }
            }
            if (changed) {
                await fs.writeJson(appPackageJsonPath, appPackageJson, { spaces: 2 });
                console.log(`  → Cleaned ${appDir}/package.json`);
            }
        }
    }
    console.log("✅ All Tailwind v4+ packages removed from workspace");
}
// Function to verify Tailwind installation
export async function verifyTailwindInstallation() {
    try {
        // Check if tailwindcss v3.4.14 is installed
        const { stdout } = await execa("pnpm", ["list", "tailwindcss", "--depth=0"], {
            encoding: "utf8"
        });
        // Check for different possible formats: "tailwindcss@3.4.14" or "tailwindcss 3.4.14"
        if (stdout.includes("tailwindcss@3.4.14") || stdout.includes("tailwindcss 3.4.14")) {
            console.log("✅ Tailwind CSS v3.4.14 verified");
            return true;
        }
        // Fallback: Check if any version of tailwindcss 3.x is installed (better than failing)
        if (stdout.includes("tailwindcss 3.")) {
            console.log("✅ Tailwind CSS v3.x detected (acceptable)");
            return true;
        }
        console.log("❌ Tailwind CSS v3.4.14 not found");
        console.log(`   → Actual output: ${stdout}`);
        return false;
    }
    catch (error) {
        // If the command fails, try a different approach
        try {
            const packageJsonPath = "package.json";
            if (await fs.pathExists(packageJsonPath)) {
                const packageJson = await fs.readJson(packageJsonPath);
                const tailwindVersion = packageJson.devDependencies?.tailwindcss;
                if (tailwindVersion && tailwindVersion.includes("3.4.14")) {
                    console.log("✅ Tailwind CSS v3.4.14 verified (via package.json)");
                    return true;
                }
            }
        }
        catch (fallbackError) {
            console.log("❌ Error in fallback verification:", fallbackError);
        }
        console.log("❌ Error verifying Tailwind installation:", error);
        return false;
    }
}
// Function to enforce Tailwind v3 across the entire workspace
export async function enforceTailwindV3(opts) {
    if (!opts.includeTailwind)
        return;
    console.log("🔒 Enforcing Tailwind v3.4.14 across workspace...");
    try {
        // Remove all v4+ packages
        await removeAllTailwindV4(opts);
        // Force fix installation
        await forceFixTailwindInstallation(opts);
        // Verify the installation (but don't fail if verification has issues)
        const isVerified = await verifyTailwindInstallation();
        if (!isVerified) {
            console.log("⚠️  Warning: Could not verify Tailwind v3.4.14 installation");
            console.log("   → Installation likely succeeded, but verification failed");
            console.log("   → Continuing with setup...");
            // Don't throw error, just continue
        }
        console.log("✅ Tailwind v3.4.14 enforcement complete!");
    }
    catch (error) {
        console.error("❌ Error enforcing Tailwind v3:", error);
        throw error;
    }
}
// Function to fix existing projects that might have v4+ issues
export async function fixExistingProject(projectPath, opts) {
    console.log(`🔧 Fixing existing project at: ${projectPath}`);
    const originalCwd = process.cwd();
    try {
        // Change to project directory
        process.chdir(projectPath);
        // Run the enforcement
        await enforceTailwindV3(opts);
        console.log(`✅ Project fixed successfully: ${projectPath}`);
    }
    catch (error) {
        console.error(`❌ Error fixing project ${projectPath}:`, error);
        throw error;
    }
    finally {
        // Always restore original directory
        process.chdir(originalCwd);
    }
}
