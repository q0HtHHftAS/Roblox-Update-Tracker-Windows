// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  fg: {
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    green: "\x1b[32m",
  },
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function timestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

type Level = "INFO" | "WARN" | "ERROR" | "OK";

function format(level: Level, message: string): string {
  const emojiMap: Record<Level, string> = {
    INFO: "ℹ️",
    WARN: "⚠️",
    ERROR: "❌",
    OK: "✅",
  };
  const colorMap: Record<Level, string> = {
    INFO: colors.fg.cyan,
    WARN: colors.fg.yellow,
    ERROR: colors.fg.red,
    OK: colors.fg.green,
  };
  const levelPadded = level.padEnd(5, " ");
  return `${colors.dim}[${timestamp()}]${colors.reset} ${colorMap[level]}[${emojiMap[level]} ${levelPadded}]${colors.reset} ${message}`;
}

const logger = {
  info(msg: string, ...optionalParams: any[]) {
    console.log(format("INFO", msg), ...optionalParams);
  },
  warn(msg: string, ...optionalParams: any[]) {
    console.warn(format("WARN", msg), ...optionalParams);
  },
  error(msg: string, ...optionalParams: any[]) {
    console.error(format("ERROR", msg), ...optionalParams);
  },
  ok(msg: string, ...optionalParams: any[]) {
    console.log(format("OK", msg), ...optionalParams);
  },
};
export default logger;
