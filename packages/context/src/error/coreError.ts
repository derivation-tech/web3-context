export class ContextCoreError extends Error {
    readonly name: string = 'ContextCoreError';
    readonly cause?: Error;

    constructor(message: string, cause?: Error) {
        super(message);
        this.cause = cause;
        this.message = `${this.message}\n${this.cause ? `\nCaused By: ${this.cause}` : ''}\n`;
    }

    toString() {
        return `[${this.name}] ${this.message}`;
    }
}
