// basic logging framework

export enum LogLevel {
    DEBUG = 30,
    INFO = 20,
    WARN = 10,
    ERROR = 0,
    SILENT = -1,
}

export class Logger {
    private static loggers: Map<string, Logger> = new Map();
    private static globalLogLevel: LogLevel = LogLevel.ERROR;

    private _name: string;
    private _logLevel: LogLevel;

    protected constructor(name: string, logLevel: LogLevel = LogLevel.SILENT) {
        this._name = name;
        this._logLevel = logLevel;
    }

    get name(): string {
        return this._name;
    }

    get logLevel(): LogLevel {
        return this._logLevel;
    }

    private shouldLog(level: LogLevel): boolean {
        return level <= this._logLevel;
    }

    log(level: string, message: string, ...args: any[]): void {
        console.log(`[${level}] chopro:${this._name} -- ${message}`, ...args);
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

    static getLogger(name: string): Logger {
        let logger: Logger;

        if (Logger.loggers.has(name)) {
            logger = Logger.loggers.get(name)!;
        } else {
            logger = new Logger(name, Logger.globalLogLevel);
            Logger.loggers.set(name, logger);
        }

        return logger;
    }

    static setGlobalLogLevel(level: LogLevel): void {
        Logger.globalLogLevel = level;

        for (const logger of Logger.loggers.values()) {
            logger._logLevel = level;
        }
    }

    static getGlobalLogLevel(): LogLevel {
        return Logger.globalLogLevel;
    }
}
