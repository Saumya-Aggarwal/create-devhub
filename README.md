# create-devhub

[![npm version](https://badge.fury.io/js/create-devhub.svg)](https://badge.fury.io/js/create-devhub)
[![GitHub](https://img.shields.io/github/license/Saumya-Aggarwal/create-devhub)](https://github.com/Saumya-Aggarwal/create-devhub/blob/main/LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/create-devhub)](https://www.npmjs.com/package/create-devhub)

🚀 **The fastest way to create production-ready Turborepo monorepos with modern web stack**

Create feature-rich monorepos in seconds with Next.js/Vite, APIs, WebSockets, and Tailwind CSS - all perfectly configured and ready to go!

## ✨ Features

- 🚀 **Turborepo monorepo** setup with optimal configuration
- 🖼️ **Frontend frameworks**: Next.js or Vite + React
- 📚 **Documentation site** (Next.js) option
- 🛠️ **HTTP servers**: Express or Fastify
- 🔌 **WebSocket server** for real-time features
- 🎨 **Tailwind CSS** with shared configuration (industry standard approach)
- 📦 **Package manager support**: npm, yarn, pnpm, or bun
- 🌱 **Git initialization** option

## 🚀 Quick Start

```bash
npx create-devhub
```

That's it! Follow the prompts and you'll have a fully configured monorepo in minutes.

## 🎯 What You Get

## Quick Start

```bash
npx create-devhub
```

## Tailwind CSS Integration

When you select **"Add Tailwind CSS with shared configuration"**, the tool implements the industry-standard approach for monorepos:

### What gets created:

1. **Shared Configuration Package** (`packages/tailwind-config/`)
   - Shared `tailwind.config.js` with preset configuration
   - PostCSS configuration
   - Content paths for all apps and packages

2. **Shared UI Package** (`packages/ui/`)
   - Pre-built Tailwind-ready components (Button, Card)
   - Utility functions for class merging
   - Ready for cross-app component sharing

3. **App Configuration**
   - Each app gets its own Tailwind config that extends the shared preset
   - CSS files with Tailwind directives and design tokens
   - Proper content paths for JIT compilation

### Benefits:

- ✅ **No CSS duplication** - each app compiles its own CSS
- ✅ **Hot reload support** - development-friendly configuration
- ✅ **ES Module compatible** - works with Next.js apps using `"type": "module"`
- ✅ **Consistent design system** - shared tokens and utilities
- ✅ **Production optimized** - JIT compilation with proper purging
- ✅ **Scalable** - easy to add new apps or modify shared styles

### Usage after setup:

```tsx
// In any app, import shared components
import { Button, Card } from "@repo/ui/button";
import { Card, CardContent, CardHeader } from "@repo/ui/card";

function MyComponent() {
  return (
    <Card className="w-96">
      <CardHeader>
        <h2 className="text-xl font-bold">Welcome</h2>
      </CardHeader>
      <CardContent>
        <Button variant="default" size="lg">
          Get Started
        </Button>
      </CardContent>
    </Card>
  );
}
```

All Tailwind utility classes work across all apps and packages in your monorepo.

## Project Structure

```
my-turbo-app/
├── apps/
│   ├── web/                 # Next.js or Vite app
│   ├── docs/                # Documentation site (optional)
│   ├── http-server/         # Express/Fastify API (optional)
│   └── ws-server/           # WebSocket server (optional)
├── packages/
│   ├── ui/                  # Shared UI components (with Tailwind)
│   ├── tailwind-config/     # Shared Tailwind configuration
│   ├── eslint-config/       # Shared ESLint config
│   └── typescript-config/   # Shared TypeScript config
├── package.json
└── turbo.json
```

## Development

```bash
# Install dependencies
npm install

# Start all apps in development mode
npm run dev

# Build all apps
npm run build

# Run linting
npm run lint
```

## Port Configuration

To avoid conflicts, apps are configured with different ports:

- **Web app**: http://localhost:3000
- **Docs**: http://localhost:3002 (if included)
- **HTTP API**: http://localhost:8000 (if included)
- **WebSocket**: ws://localhost:8080 (if included)

## Package Manager Support

The tool detects available package managers and lets you choose:

- **npm** - Default, comes with Node.js
- **yarn** - Fast, reliable dependency management
- **pnpm** - Efficient disk space usage (recommended for monorepos)
- **bun** - Fast JavaScript runtime and package manager

## Advanced Tailwind CSS Configuration

The shared Tailwind setup follows industry best practices:

### Shared Configuration (`packages/tailwind-config/tailwind.config.js`)

```javascript
module.exports = {
  content: [
    '../../apps/*/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    // ... more patterns
  ],
  theme: {
    extend: {
      colors: {
        // Design system tokens
        primary: "hsl(var(--primary))",
        secondary: "hsl(var(--secondary))",
        // ... more tokens
      }
    }
  },
  plugins: []
}
```

### App-specific Configuration

Each app extends the shared config using Tailwind's preset feature:

```javascript
// apps/web/tailwind.config.js
const sharedConfig = require("@repo/tailwind-config/tailwind.config");

module.exports = {
  presets: [sharedConfig],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}'
  ]
}
```

This approach ensures:
- **Hot reload works** in development
- **No CSS specificity conflicts**
- **Each app can have custom overrides**
- **Shared design tokens are consistent**

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test with `npm run build`
5. Submit a pull request

## License

MIT
