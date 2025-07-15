# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2025-07-15

### Added
- 🎛️ DevHub Dashboard - Interactive monitoring dashboard for all services
- 📊 Service status monitoring for Web, Docs, API, and WebSocket servers
- 🔄 Auto-refresh functionality with manual refresh capability
- 🧪 API testing interface with request/response viewer
- 💬 WebSocket chat interface for real-time testing
- ⚡ Quick action buttons for common commands (dev, build, lint, test)
- 📝 Activity log for tracking service status changes
- 🎨 Beautiful dark theme with DevHub branding
- 🔧 System information display

### Improved
- 🔄 Enhanced spinner component with better visual feedback
- 📦 Optimized project structure and template organization
- 🛠️ Better error handling and status reporting
- 🎯 Improved build process and deployment workflow

### Fixed
- 🐛 Template file organization and consistency
- 📁 Cleaned up test artifacts and temporary files

## [1.0.0] - 2025-07-04

### Added
- 🚀 Initial release of create-devhub CLI
- 📦 Turborepo monorepo scaffolding with optimal configuration
- 🖼️ Frontend framework support: Next.js and Vite + React
- 📚 Optional documentation site with Next.js
- 🛠️ HTTP server templates: Express and Fastify
- 🔌 WebSocket server template for real-time features
- 🎨 Shared Tailwind CSS configuration across all apps
- 📦 Package manager support: npm, yarn, pnpm, and bun
- 🌱 Git initialization option
- 🎯 Pre-configured ports to avoid conflicts
- ✨ Shared UI component library with Tailwind
- 🔧 TypeScript configuration for all packages
- 🧹 ESLint configuration sharing
- 🚦 Turbo build caching optimization

### Features
- Interactive CLI prompts for easy setup
- Production-ready monorepo structure
- Hot reload development experience
- Shared component library
- Design system with CSS variables
- Dark mode support
- Build optimization with Turbo
- Cross-package dependencies handled automatically

### Technical Details
- Built with TypeScript
- Uses Commander.js for CLI interface
- Leverages create-turbo for base setup
- Templates for all major use cases
- Comprehensive error handling
- Platform-agnostic (Windows, macOS, Linux)
