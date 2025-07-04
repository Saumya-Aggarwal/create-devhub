# Contributing to create-devhub

Thank you for your interest in contributing to create-devhub! 🎉

## 🚀 Quick Start

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/create-devhub.git
   cd create-devhub
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

5. **Test locally**:
   ```bash
   node dist/bin/index.js
   ```

## 🛠️ Development Workflow

### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** in the appropriate files:
   - `core/` - CLI logic and utilities
   - `templates/` - Project templates
   - `bin/` - CLI entry point

3. **Test your changes**:
   ```bash
   npm run build
   node dist/bin/index.js
   ```

4. **Create a test project** to verify everything works:
   ```bash
   # In a different directory
   node /path/to/create-devhub/dist/bin/index.js
   cd test-project
   npm run dev
   npm run build
   ```

### Adding New Templates

To add a new app template:

1. Create the template in `templates/your-template/`
2. Update `core/prompts.ts` to include the new option
3. Update `core/util.ts` to handle the new template
4. Test thoroughly with different package managers

### Code Style

- Use TypeScript
- Follow existing code patterns
- Add comments for complex logic
- Use descriptive variable names

## 🐛 Bug Reports

When filing a bug report, please include:

- Operating system and version
- Node.js version
- Package manager (npm, yarn, pnpm, bun)
- Steps to reproduce
- Expected vs actual behavior
- Console output/error messages

## 💡 Feature Requests

Before suggesting a feature:

1. Check if it already exists in issues
2. Consider if it fits the project's scope
3. Provide a clear use case
4. Consider implementation complexity

## 📝 Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Update CHANGELOG.md** with your changes
4. **Ensure your code builds** without errors
5. **Test with multiple package managers**
6. **Create clear commit messages**

### Commit Message Format

```
type: brief description

Longer description if needed

- Bullet points for details
- Reference issues with #123
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

## 🤝 Community

- Be respectful and inclusive
- Help others learn and grow
- Share knowledge and best practices
- Celebrate contributions of all sizes

## 📞 Questions?

Feel free to open an issue for questions or start a discussion!

Thank you for contributing! 🙏
