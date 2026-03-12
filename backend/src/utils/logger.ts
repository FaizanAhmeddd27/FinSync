const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const timestamp = (): string => new Date().toISOString();

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`${colors.cyan}[${timestamp()}] INFO:${colors.reset} ${message}`, ...args);
  },
  success: (message: string, ...args: any[]) => {
    console.log(`${colors.green}[${timestamp()}] SUCCESS:${colors.reset} ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`${colors.yellow}[${timestamp()}] WARN:${colors.reset} ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`${colors.red}[${timestamp()}] ERROR:${colors.reset} ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${colors.magenta}[${timestamp()}] DEBUG:${colors.reset} ${message}`, ...args);
    }
  },
  db: (message: string, ...args: any[]) => {
    console.log(`${colors.blue}[${timestamp()}] DB:${colors.reset} ${message}`, ...args);
  },
};

export default logger;