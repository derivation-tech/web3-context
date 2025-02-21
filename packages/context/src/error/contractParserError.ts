import { ContextCoreError } from './coreError';

export class ContractParserError extends ContextCoreError {
    readonly name: string = 'ContractParserError';
}
