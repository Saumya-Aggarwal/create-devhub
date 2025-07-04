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
