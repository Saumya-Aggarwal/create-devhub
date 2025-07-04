import prompts, { PromptObject } from "prompts";
import { getAvailablePackageManagers } from "./util.js";

export interface UserOptions {
  projectName: string;
  frontend: "web-next" | "web-vite";
  includeDocs: boolean;
  includeWS: boolean;
  httpServer: "http-express" | "http-fastify" | null;
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
  includeTailwind: boolean;
}

export async function askUserOptions(): Promise<UserOptions> {
  // Get available package managers
  const availablePackageManagers = await getAvailablePackageManagers();
  
  const questions: PromptObject[] = [
    {
      type: 'text',
      name: 'projectName',
      message: '📁 Project name:',
      initial: 'my-turbo-app',
    },    {
      type: 'select',
      name: 'frontend',
      message: '🖼️  Choose frontend framework:',
      choices: [
        { title: 'Next.js', value: 'web-next' },
        { title: 'Vite + React', value: 'web-vite' },
      ],
    },
    {
      type: 'confirm',
      name: 'includeDocs',
      message: '📚 Include documentation site? (Next.js)',
      initial: true,
    },
    {
      type: 'confirm',
      name: 'includeWS',
      message: '🔌 Include a WebSocket server?',
      initial: false,
    },
    {
      type: 'select',
      name: 'httpServer',
      message: '🛠️  HTTP server:',
      choices: [
        { title: 'Express', value: 'http-express' },
        { title: 'Fastify', value: 'http-fastify' },
        { title: 'None', value: null },
      ],
    },    {
      type: 'select',
      name: 'packageManager',
      message: '📦 Choose package manager:',
      choices: availablePackageManagers,
      initial: 0,
    },
    {
      type: 'confirm',
      name: 'includeTailwind',
      message: '🎨 Add Tailwind CSS with shared configuration?',
      initial: true,
    },
  ];

  // Run the prompts
  const response = await prompts(questions, {
    onCancel: () => {
      console.log('\n✋ Setup cancelled.');
      process.exit(1);
    },
  });

  // Type assertion because prompts can return partials
  return response as UserOptions;
}