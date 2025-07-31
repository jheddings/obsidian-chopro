export enum LogLevel {
    DEBUG = 30,
    INFO = 20,
    WARN = 10,
    ERROR = 0,
    SILENT = -1,
}

export class LoggerInstance {
    private name: string;
    private logLevel: LogLevel;

    constructor(name: string, logLevel: LogLevel = LogLevel.SILENT) {
        this.name = name;
        this.logLevel = logLevel;
    }

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    private shouldLog(level: LogLevel): boolean {
        return level <= this.logLevel;
    }

    log(level: string, message: string, ...args: any[]): void {
        console.log(`[${level}] STOMP:${this.name} -- ${message}`, ...args);
    }

    debug(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            this.log("DEBUG", message, ...args);
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.INFO)) {
            this.log("INFO", message, ...args);
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.WARN)) {
            this.log("WARN", message, ...args);
        }
    }

    error(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            this.log("ERROR", message, ...args);
        }
    }
}

export class Logger {
    private static loggers: Map<string, LoggerInstance> = new Map();
    private static globalLogLevel: LogLevel = LogLevel.ERROR;

    static getLogger(name: string): LoggerInstance {
        let logger;
        if (Logger.loggers.has(name)) {
            logger = Logger.loggers.get(name)!;
        } else {
            logger = new LoggerInstance(name, Logger.globalLogLevel);
            Logger.loggers.set(name, logger);
        }
        return logger;
    }

    static setGlobalLogLevel(level: LogLevel): void {
        Logger.globalLogLevel = level;

        for (const logger of Logger.loggers.values()) {
            logger.setLogLevel(level);
        }
    }

    static getGlobalLogLevel(): LogLevel {
        return Logger.globalLogLevel;
    }
}
