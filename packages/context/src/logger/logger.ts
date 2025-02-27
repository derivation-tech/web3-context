import chalk from 'chalk';
import moment from 'moment';

const formatTs = () => moment().format();

export enum LogLevel {
    Silent = 0,
    Info = 1,
    Debug = 2,
}

export abstract class BaseLogger {
    name: string;
    logLevel: LogLevel;

    protected constructor(name: string, logLevel: LogLevel = LogLevel.Info) {
        this.name = name;
        this.logLevel = logLevel;
    }
    abstract info(...args: any[]): void;
    abstract warn(...args: any[]): void;
    abstract error(...args: any[]): void;
    abstract debug(...args: any[]): void;
}

export class Logger extends BaseLogger {
    constructor(name: string, logLevel: LogLevel = LogLevel.Info) {
        super(name, logLevel);
    }

    info(...args: any[]) {
        if (LogLevel.Info <= this.logLevel) {
            console.info(...[formatTs(), `[${this.name}]`, chalk.greenBright('INFO'), ...args]);
        }
    }

    warn(...args: any[]) {
        if (LogLevel.Info <= this.logLevel) {
            console.info(...[formatTs(), `[${this.name}]`, chalk.yellowBright('WARN'), ...args]);
        }
    }

    error(...args: any[]) {
        if (LogLevel.Info <= this.logLevel) {
            console.info(...[formatTs(), `[${this.name}]`, chalk.red('ERROR'), ...args]);
        }
    }

    debug(...args: any[]) {
        if (LogLevel.Debug <= this.logLevel) {
            console.info(...[formatTs(), `[${this.name}]`, chalk.cyanBright('DEBUG'), ...args]);
        }
    }
}

export class LoggerFactory {
    static getLogger(name: string, logLevel: LogLevel = LogLevel.Info): BaseLogger {
        return new Logger(name, logLevel);
    }
}
