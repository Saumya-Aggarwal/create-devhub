import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { execa } from "execa";
import { UserOptions } from "./prompts.js";

// Get the directory where this util.ts file is located
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to detect available package managers
export async function getAvailablePackageManagers(): Promise<Array<{title: string, value: string}>> {
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
    } catch {
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
export async function customizeApps(opts: UserOptions) {
  // Handle frontend choice
  if (opts.frontend === "web-vite") {
    // Remove default Next.js web app
    await fs.remove("apps/web");
    
    // Create Vite app using official create-vite
    await execa("npx", [
      "create-vite@latest", 
      "apps/web", 
      "--template", 
      "react-ts"
    ], { stdio: "pipe" });
  }
  
  // Handle docs choice
  if (!opts.includeDocs) {
    await fs.remove("apps/docs");
  }
}

// Helper function to add custom apps
export async function addCustomApps(opts: UserOptions) {
  if (!opts.httpServer && !opts.includeWS) return;
  
  // Add HTTP server if requested
  if (opts.httpServer) {
    const serverTemplatePath = path.join(__dirname, "..", "..", "templates", opts.httpServer);
    await fs.copy(serverTemplatePath, "apps/http-server");
    // Fix local workspace dependency for correct package manager
    const httpServerPkg = "apps/http-server/package.json";
    if (await fs.pathExists(httpServerPkg)) {
      const pkg = await fs.readJson(httpServerPkg);
      if (pkg.devDependencies && pkg.devDependencies["@repo/typescript-config"]) {
        if (opts.packageManager === "pnpm" || opts.packageManager === "yarn") {
          pkg.devDependencies["@repo/typescript-config"] = "workspace:*";
        } else {
          pkg.devDependencies["@repo/typescript-config"] = "*";
        }
        await fs.writeJson(httpServerPkg, pkg, { spaces: 2 });
      }
    }
  }

  // Add WebSocket server if requested
  if (opts.includeWS) {
    const wsTemplatePath = path.join(__dirname, "..", "..", "templates", "ws-server");
    await fs.copy(wsTemplatePath, "apps/ws-server");
    // Fix local workspace dependency for correct package manager
    const wsServerPkg = "apps/ws-server/package.json";
    if (await fs.pathExists(wsServerPkg)) {
      const pkg = await fs.readJson(wsServerPkg);
      if (pkg.devDependencies && pkg.devDependencies["@repo/typescript-config"]) {
        if (opts.packageManager === "pnpm" || opts.packageManager === "yarn") {
          pkg.devDependencies["@repo/typescript-config"] = "workspace:*";
        } else {
          pkg.devDependencies["@repo/typescript-config"] = "*";
        }
        await fs.writeJson(wsServerPkg, pkg, { spaces: 2 });
      }
    }
  }
}

// Function to update turbo.json for custom apps
export async function updateTurboConfig(opts: UserOptions) {  
  const turboConfigPath = "turbo.json";
  if (await fs.pathExists(turboConfigPath)) {
    const turboConfig = await fs.readJson(turboConfigPath);
    
    // Ensure tasks object exists
    if (!turboConfig.tasks) turboConfig.tasks = {};
    
    // Update build task outputs to include all possible output directories
    if (!turboConfig.tasks.build) {
      turboConfig.tasks.build = {};
    }
    
    // Set comprehensive outputs for all app types
    turboConfig.tasks.build.outputs = [
      ".next/**",        // Next.js apps
      "!.next/cache/**", // Exclude Next.js cache
      "dist/**",         // TypeScript/Vite builds
      "build/**"         // Alternative build directory
    ];
    
    // Ensure dependsOn is set
    turboConfig.tasks.build.dependsOn = turboConfig.tasks.build.dependsOn || ["^build"];
    
    // Add tasks for custom apps if they exist
    if (opts.httpServer) {
      // Ensure the app is included in build and dev tasks
      if (turboConfig.tasks.dev) {
        turboConfig.tasks.dev.cache = false; // Dev tasks shouldn't cache
      }
    }
    
    await fs.writeJson(turboConfigPath, turboConfig, { spaces: 2 });
  }
}

// Function to update workspace package.json
export async function updateWorkspacePackageJson() {
  const packageJsonPath = "package.json";
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    
    // Remove type: module if it exists to avoid conflicts with Next.js apps
    if (packageJson.type) {
      delete packageJson.type;
    }
    
    // Ensure workspaces includes packages directory
    if (!packageJson.workspaces) {
      packageJson.workspaces = ["apps/*", "packages/*"];
    } else if (Array.isArray(packageJson.workspaces)) {
      if (!packageJson.workspaces.includes("packages/*")) {
        packageJson.workspaces.push("packages/*");
      }
    }
    
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }
}

// Function to fix TypeScript config package for pnpm compatibility
export async function fixTypeScriptConfigPackage() {
  const tsConfigPackageJsonPath = "packages/typescript-config/package.json";
  if (await fs.pathExists(tsConfigPackageJsonPath)) {
    const tsConfigPackageJson = await fs.readJson(tsConfigPackageJsonPath);
    
    // Add proper exports for pnpm to resolve workspace dependencies
    tsConfigPackageJson.exports = {
      "./base.json": "./base.json",
      "./nextjs.json": "./nextjs.json",
      "./react-library.json": "./react-library.json"
    };
    
    // Add files field to indicate what should be included
    tsConfigPackageJson.files = [
      "base.json",
      "nextjs.json", 
      "react-library.json"
    ];
    
    await fs.writeJson(tsConfigPackageJsonPath, tsConfigPackageJson, { spaces: 2 });
  }
}

// Function to configure docs app port
export async function configureDocsPort(opts: UserOptions) {
  if (!opts.includeDocs) return;
  
  const docsPackageJsonPath = "apps/docs/package.json";
  if (await fs.pathExists(docsPackageJsonPath)) {
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
  }
}

// Function to configure all app ports to avoid conflicts
export async function configureAllAppPorts(opts: UserOptions) {
  // Configure docs port if included
  if (opts.includeDocs) {
    await configureDocsPort(opts);
  }
  
  // Configure HTTP server port if included
  if (opts.httpServer) {
    const httpServerPackageJsonPath = "apps/http-server/package.json";
    if (await fs.pathExists(httpServerPackageJsonPath)) {
      const httpPackageJson = await fs.readJson(httpServerPackageJsonPath);
      
      // Update the source file to use port 8000
      const serverIndexPath = "apps/http-server/src/index.ts";
      if (await fs.pathExists(serverIndexPath)) {
        let serverContent = await fs.readFile(serverIndexPath, 'utf-8');
        serverContent = serverContent.replace(
          /const PORT = process\.env\.PORT \? parseInt\(process\.env\.PORT\) : \d+;/,
          'const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;'
        );
        await fs.writeFile(serverIndexPath, serverContent);
      }
    }
  }
  
  // Configure WebSocket server port if included
  if (opts.includeWS) {
    const wsServerIndexPath = "apps/ws-server/src/index.ts";
    if (await fs.pathExists(wsServerIndexPath)) {
      let wsContent = await fs.readFile(wsServerIndexPath, 'utf-8');
      wsContent = wsContent.replace(
        /const PORT = process\.env\.PORT \? parseInt\(process\.env\.PORT\) : \d+;/,
        'const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;'
      );
      await fs.writeFile(wsServerIndexPath, wsContent);
    }
  }
}

// Function to setup Tailwind CSS with shared configuration
export async function setupTailwindCSS(opts: UserOptions) {
  // 1. Create packages directory if it doesn't exist
  await fs.ensureDir("packages");
  
  // 2. Create shared Tailwind config package
  const tailwindConfigDir = "packages/tailwind-config";
  await fs.ensureDir(tailwindConfigDir);
  
  // Create package.json for tailwind-config
  const tailwindConfigPackageJson = {
    "name": "@repo/tailwind-config",
    "version": "0.0.0",
    "private": true,
    "files": ["tailwind.config.js", "tailwind.config.mjs", "postcss.config.js", "postcss.config.mjs"],
    "exports": {
      "./tailwind.config.js": "./tailwind.config.js",
      "./tailwind.config.mjs": "./tailwind.config.mjs",
      "./postcss.config.js": "./postcss.config.js",
      "./postcss.config.mjs": "./postcss.config.mjs"
    }
  };
  
  await fs.writeJson(
    path.join(tailwindConfigDir, "package.json"), 
    tailwindConfigPackageJson, 
    { spaces: 2 }
  );
  
  // Create shared tailwind.config.js
  const sharedTailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // App-specific patterns
    '../../apps/*/src/**/*.{js,ts,jsx,tsx}',
    '../../apps/*/pages/**/*.{js,ts,jsx,tsx}',
    '../../apps/*/components/**/*.{js,ts,jsx,tsx}',
    '../../apps/*/app/**/*.{js,ts,jsx,tsx}',
    
    // Package-specific patterns
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/components/**/*.{js,ts,jsx,tsx}',
    
    // Catch any additional component locations
    '../../packages/*/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}`;
  
  await fs.writeFile(
    path.join(tailwindConfigDir, "tailwind.config.js"), 
    sharedTailwindConfig
  );
  
  // Create shared postcss.config.js
  const sharedPostCSSConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
  
  await fs.writeFile(
    path.join(tailwindConfigDir, "postcss.config.js"), 
    sharedPostCSSConfig
  );
  
  // Also create ES module versions for Next.js apps with type: "module"
  const sharedTailwindConfigESM = `/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    // App-specific patterns
    '../../apps/*/src/**/*.{js,ts,jsx,tsx}',
    '../../apps/*/pages/**/*.{js,ts,jsx,tsx}',
    '../../apps/*/components/**/*.{js,ts,jsx,tsx}',
    '../../apps/*/app/**/*.{js,ts,jsx,tsx}',
    
    // Package-specific patterns
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/components/**/*.{js,ts,jsx,tsx}',
    
    // Catch any additional component locations
    '../../packages/*/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;`;
  
  await fs.writeFile(
    path.join(tailwindConfigDir, "tailwind.config.mjs"), 
    sharedTailwindConfigESM
  );
  
  const sharedPostCSSConfigESM = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`;
  
  await fs.writeFile(
    path.join(tailwindConfigDir, "postcss.config.mjs"), 
    sharedPostCSSConfigESM
  );
  
  // 3. Configure apps to use shared Tailwind config
  
  // Configure web app
  const webAppPath = "apps/web";
  if (await fs.pathExists(webAppPath)) {
    await configureTailwindForApp(webAppPath, opts.frontend);
  }
  
  // Configure docs app if it exists
  if (opts.includeDocs && await fs.pathExists("apps/docs")) {
    await configureTailwindForApp("apps/docs", "web-next");
  }
  
  // 4. Add Tailwind dependencies to workspace
  const workspacePackageJsonPath = "package.json";
  if (await fs.pathExists(workspacePackageJsonPath)) {
    const workspacePackageJson = await fs.readJson(workspacePackageJsonPath);
    
    if (!workspacePackageJson.devDependencies) {
      workspacePackageJson.devDependencies = {};
    }
    
    // Add Tailwind dependencies
    workspacePackageJson.devDependencies.tailwindcss = "^3.4.0";
    workspacePackageJson.devDependencies.postcss = "^8.4.0";
    workspacePackageJson.devDependencies.autoprefixer = "^10.4.0";
    workspacePackageJson.devDependencies["prettier-plugin-tailwindcss"] = "^0.5.0";
    workspacePackageJson.devDependencies.clsx = "^2.0.0";
    workspacePackageJson.devDependencies["tailwind-merge"] = "^2.0.0";
    
    await fs.writeJson(workspacePackageJsonPath, workspacePackageJson, { spaces: 2 });
  }
  
  // 5. Create shared UI package with Tailwind-ready components
  const uiPackageTemplatePath = path.join(__dirname, "..", "..", "templates", "ui-package");
  await fs.copy(uiPackageTemplatePath, "packages/ui");
  
  // Update UI package.json to reference existing workspace packages
  const uiPackageJsonPath = "packages/ui/package.json";
  if (await fs.pathExists(uiPackageJsonPath)) {
    const uiPackageJson = await fs.readJson(uiPackageJsonPath);
    
    // Note: Workspace package references are commented out to avoid install issues
    // Users can manually add these after project creation if needed:
    // "@repo/eslint-config": "*"
    // "@repo/typescript-config": "*"
    
    await fs.writeJson(uiPackageJsonPath, uiPackageJson, { spaces: 2 });
  }
  
  // Update tsconfig.json to use standalone config (avoids workspace dependency issues)
  const uiTsConfigPath = "packages/ui/tsconfig.json";
  if (await fs.pathExists(uiTsConfigPath)) {
    // Keep the standalone TypeScript config to avoid dependency issues
  }
}

// Helper function to configure Tailwind for a specific app
async function configureTailwindForApp(appPath: string, framework: "web-next" | "web-vite") {
  // Check if the app has ES module configuration
  const appPackageJsonPath = path.join(appPath, "package.json");
  let isESModule = false;
  
  if (await fs.pathExists(appPackageJsonPath)) {
    const appPackageJson = await fs.readJson(appPackageJsonPath);
    isESModule = appPackageJson.type === "module";
  }
  
  // Create app-specific tailwind.config.js
  let appTailwindConfig: string;
  let appPostCSSConfig: string;
  
  if (isESModule) {
    // Use ES module syntax for apps with type: "module"
    // Use .mjs extension to ensure ES module handling
    appTailwindConfig = `/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;`;

    appPostCSSConfig = `const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;`;
    
    // Write with .mjs extension for ES modules
    await fs.writeFile(
      path.join(appPath, "tailwind.config.mjs"), 
      appTailwindConfig
    );
    
    await fs.writeFile(
      path.join(appPath, "postcss.config.mjs"), 
      appPostCSSConfig
    );
  } else {
    // Use CommonJS syntax for other apps
    appTailwindConfig = `/** @type {import('tailwindcss').Config} */
const sharedConfig = require("@repo/tailwind-config/tailwind.config");

module.exports = {
  presets: [sharedConfig],
  content: [
    './src/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}'
  ]
};`;

    appPostCSSConfig = `module.exports = require("@repo/tailwind-config/postcss.config");`;
    
    await fs.writeFile(
      path.join(appPath, "tailwind.config.js"), 
      appTailwindConfig
    );
    
    await fs.writeFile(
      path.join(appPath, "postcss.config.js"), 
      appPostCSSConfig
    );
  }
  
  // Add Tailwind directives to CSS file
  if (framework === "web-next") {
    // For Next.js apps, add to globals.css
    const globalsPath = path.join(appPath, "app", "globals.css");
    const globalsAltPath = path.join(appPath, "styles", "globals.css");
    const globalsAltPath2 = path.join(appPath, "src", "app", "globals.css");
    
    let cssPath = globalsPath;
    if (await fs.pathExists(globalsAltPath)) {
      cssPath = globalsAltPath;
    } else if (await fs.pathExists(globalsAltPath2)) {
      cssPath = globalsAltPath2;
    }
    
    if (await fs.pathExists(cssPath)) {
      const existingCSS = await fs.readFile(cssPath, 'utf-8');
      if (!existingCSS.includes('@tailwind')) {
        const tailwindDirectives = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}

* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

${existingCSS}`;
        await fs.writeFile(cssPath, tailwindDirectives);
      }
    } else {
      // Create globals.css if it doesn't exist
      const appDir = path.join(appPath, "app");
      await fs.ensureDir(appDir);
      const newGlobalsPath = path.join(appDir, "globals.css");
      
      const tailwindCSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}

* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}`;
      
      await fs.writeFile(newGlobalsPath, tailwindCSS);
    }
  } else if (framework === "web-vite") {
    // For Vite apps, add to index.css
    const indexCSSPath = path.join(appPath, "src", "index.css");
    
    if (await fs.pathExists(indexCSSPath)) {
      const existingCSS = await fs.readFile(indexCSSPath, 'utf-8');
      if (!existingCSS.includes('@tailwind')) {
        const tailwindDirectives = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}

* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

${existingCSS}`;
        await fs.writeFile(indexCSSPath, tailwindDirectives);
      }
    }
  }
}

// Function to create beautiful landing pages
export async function createLandingPages(opts: UserOptions) {
  const landingPagesDir = path.join(__dirname, "..", "..", "templates", "landing-pages");
  const dashboardDir = path.join(__dirname, "..", "..", "templates", "dashboard");
  
  // Copy dashboard to public folder for web apps
  const copyDashboard = async (appPath: string) => {
    const publicDir = path.join(appPath, "public");
    await fs.ensureDir(publicDir);
    await fs.copy(dashboardDir, path.join(publicDir, "dashboard"));
  };
  
  // Helper to apply landing page to a Next.js app (web or docs)
  async function applyNextLanding(appPath: string) {
    const nextPageContent = await fs.readFile(path.join(landingPagesDir, "nextjs-page.tsx"), 'utf-8');
    const appRouterPath = path.join(appPath, "app");
    const pagesRouterPath = path.join(appPath, "pages");
    if (await fs.pathExists(appRouterPath)) {
      await fs.writeFile(path.join(appRouterPath, "page.tsx"), nextPageContent);
    } else if (await fs.pathExists(pagesRouterPath)) {
      await fs.writeFile(path.join(pagesRouterPath, "index.tsx"), nextPageContent);
    } else {
      await fs.ensureDir(appRouterPath);
      await fs.writeFile(path.join(appRouterPath, "page.tsx"), nextPageContent);
      const layoutContent = `import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DevHub - Modern Monorepo",
  description: "Built with create-devhub",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}`;
      await fs.writeFile(path.join(appRouterPath, "layout.tsx"), layoutContent);
    }
  }

  // Web app landing page
  const webAppPath = "apps/web";
  if (await fs.pathExists(webAppPath)) {
    if (opts.frontend === "web-next") {
      await applyNextLanding(webAppPath);
      await copyDashboard(webAppPath);
    } else if (opts.frontend === "web-vite") {
      const viteAppContent = await fs.readFile(path.join(landingPagesDir, "vite-app.tsx"), 'utf-8');
      const viteCSSContent = await fs.readFile(path.join(landingPagesDir, "vite-index.css"), 'utf-8');
      await fs.writeFile(path.join(webAppPath, "src", "App.tsx"), viteAppContent);
      await fs.writeFile(path.join(webAppPath, "src", "index.css"), viteCSSContent);
      await copyDashboard(webAppPath);
      const mainContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
      await fs.writeFile(path.join(webAppPath, "src", "main.tsx"), mainContent);
    }
  }

  // Docs app landing page (always Next.js)
  if (opts.includeDocs && await fs.pathExists("apps/docs")) {
    await applyNextLanding("apps/docs");
    await copyDashboard("apps/docs");
  }
}
