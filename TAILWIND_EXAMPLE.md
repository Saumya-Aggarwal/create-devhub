# Tailwind CSS Setup Example

After running `create-devhub` with Tailwind CSS enabled, your project structure will look like this:

```
my-turbo-app/
├── apps/
│   ├── web/
│   │   ├── tailwind.config.js          # App-specific config
│   │   ├── postcss.config.js           # PostCSS config
│   │   └── src/
│   │       ├── app/globals.css         # Tailwind directives + design tokens
│   │       └── components/
│   └── docs/                           # Same structure if included
├── packages/
│   ├── tailwind-config/
│   │   ├── package.json
│   │   ├── tailwind.config.js          # Shared configuration
│   │   └── postcss.config.js
│   └── ui/
│       ├── package.json
│       └── src/
│           ├── button.tsx              # Pre-built components
│           ├── card.tsx
│           └── utils.ts                # Utility functions
└── package.json                       # Workspace with Tailwind deps
```

## Example Usage

### In your web app (`apps/web/src/app/page.tsx`):

```tsx
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Welcome to Your Dev Hub
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Turborepo + Tailwind CSS setup is complete!
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Frontend Ready</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your app is configured with Tailwind CSS and shared UI components.
              </p>
              <Button variant="default" size="lg" className="w-full">
                Start Building
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shared Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use components from @repo/ui across all your apps.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Secondary
                </Button>
                <Button variant="destructive" size="sm">
                  Danger
                </Button>
                <Button variant="ghost" size="sm">
                  Ghost
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <span className="text-primary text-xl">🎨</span>
              </div>
              <h3 className="font-semibold">Tailwind CSS Design System</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                All design tokens are configured as CSS variables. Supports light/dark modes 
                and can be customized in the shared configuration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## CSS Variables Available

The setup includes a complete design system with CSS variables:

```css
/* Light mode */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --muted: 210 40% 96%;
  --accent: 210 40% 96%;
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
  /* ... more tokens */
}

/* Dark mode */
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark variants */
}
```

## Adding Custom Styles

### In shared config (`packages/tailwind-config/tailwind.config.js`):

```javascript
module.exports = {
  content: [/* ... */],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
      }
    }
  },
  plugins: []
}
```

### App-specific customizations (`apps/web/tailwind.config.js`):

```javascript
const sharedConfig = require("@repo/tailwind-config/tailwind.config");

module.exports = {
  presets: [sharedConfig],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      // App-specific overrides
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    }
  }
}
```

This setup ensures consistent styling across all apps while allowing per-app customization when needed.
