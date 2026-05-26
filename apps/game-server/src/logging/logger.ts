function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: string, msg: string, data?: Record<string, unknown>): string {
  const timestamp = formatTimestamp();
  const base = `[${timestamp}] [${level}] ${msg}`;
  if (data && Object.keys(data).length > 0) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
}

export const logger = {
  info(msg: string, data?: Record<string, unknown>): void {
    console.log(formatMessage("INFO", msg, data));
  },

  warn(msg: string, data?: Record<string, unknown>): void {
    console.warn(formatMessage("WARN", msg, data));
  },

  error(msg: string, data?: Record<string, unknown>): void {
    console.error(formatMessage("ERROR", msg, data));
  },

  debug(msg: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatMessage("DEBUG", msg, data));
    }
  },
};
