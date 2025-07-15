import chalk from "chalk";

export class Spinner {
  private interval: NodeJS.Timeout | null = null;
  private readonly frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private frameIndex = 0;
  private message = '';
  
  constructor(message: string) {
    this.message = message;
  }

  start() {
    process.stdout.write('\x1B[?25l'); // Hide cursor
    this.interval = setInterval(() => {
      process.stdout.write('\r' + chalk.cyan(this.frames[this.frameIndex]) + ' ' + this.message);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
    return this;
  }

  succeed(message?: string) {
    this.stop();
    const finalMessage = message || this.message;
    process.stdout.write('\r' + chalk.green('✓') + ' ' + finalMessage + '\n');
    return this;
  }

  fail(message?: string) {
    this.stop();
    const finalMessage = message || this.message;
    process.stdout.write('\r' + chalk.red('✗') + ' ' + finalMessage + '\n');
    return this;
  }

  update(message: string) {
    this.message = message;
    return this;
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\r\x1B[K'); // Clear line
    process.stdout.write('\x1B[?25h'); // Show cursor
    return this;
  }
}

export function createSpinner(message: string) {
  return new Spinner(message);
}
