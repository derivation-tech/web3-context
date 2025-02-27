import { ethers } from 'ethers';
import { ErrorDescription } from '@ethersproject/abi/lib/interface';
import { Interface } from 'ethers/lib/utils';
import { Provider } from '@ethersproject/providers';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import retry from 'async-retry';
import { DEFAULT_RETRY_OPTION, LoggerFactory } from '@derivation-tech/context';

// This function parses both custom error(EIP-838) and general error msg
// if it's a custom error, it will return an error description
// if it's a general error, it will return a string error msg
// if tx not found, it will return undefined
// abi from json string or json object: const abi: Interface = new utils.Interface('jsonstr')
export async function getRevertReason(
    provider: Provider,
    txHashOrResponse: ethers.providers.TransactionResponse | string,
    abis: Interface[] = [],
    logger = LoggerFactory.getLogger('Revert'),
): Promise<ErrorDescription | string | undefined> {
    try {
        if (typeof txHashOrResponse === 'string') {
            txHashOrResponse = await retry(async () => {
                return provider.getTransaction(txHashOrResponse as string);
            }, DEFAULT_RETRY_OPTION);
        }

        if (!txHashOrResponse) {
            logger.error('transaction response is null, try again later');
            return undefined;
        }

        let codeOrMsg;

        await retry(async () => {
            try {
                codeOrMsg = await extractRevertData(provider, txHashOrResponse as ethers.providers.TransactionResponse);
            } catch (e: any) {
                if ((e.code === 'SERVER_ERROR' && e.reason === 'missing response') || e.code === 'TIMEOUT') {
                    // 'missing response' normally caused by a poor connection, it means no data was retrieved, we need to retry
                    throw e;
                }
                const err = parseServerError(e.error ? e.error : e, abis);
                return err.msg;
            }
        }, DEFAULT_RETRY_OPTION);

        // parse custome error
        for (const abi of abis) {
            try {
                return abi.parseError(codeOrMsg);
            } catch (parseErr) {
                // no matching error
                // console.error('no matching error', parseErr);
            }
        }
        // general error msg, only string, no args
        const reason = codeOrMsg && codeOrMsg.startsWith('0x') ? decodeRevertData(codeOrMsg) : codeOrMsg;
        return reason;
    } catch (err) {
        logger.error(err);
        throw new Error('Unable to decode revert reason.');
    }
}

export async function extractRevertData(provider: Provider, response: ethers.providers.TransactionResponse) {
    const request: TransactionRequest = {};
    Object.assign(request, response);
    if (request.type === 2) {
        request.gasPrice = undefined;
    } else {
        request.maxFeePerGas = undefined;
        request.maxPriorityFeePerGas = undefined;
    }
    return await provider.call(request, response.blockNumber);
}

export function decodeRevertData(code: string): string {
    // NOTE: `code` may end with 0's which will return a text string with empty whitespace characters
    // This will truncate all 0s and set up the hex string as expected
    let codeString;
    codeString = `0x${code.substr(138)}`.replace(/0+$/, '');
    // If the codeString is an odd number of characters, add a trailing 0
    if (codeString.length % 2 === 1) {
        codeString += '0';
    }
    return ethers.utils.toUtf8String(codeString);
}

export function parseServerError(e: any, abis: Interface[] = []) {
    let reason = e.reason;
    let desc;
    if (e.error && e.error.data && e.error.data.message) {
        reason = e.error.data.message;
    }

    if (e.body) {
        const body = JSON.parse(e.body);
        if (body.error && body.error.message) {
            reason = body.error.message;
        }
        if (body.error && body.error.data) {
            for (const abi of abis) {
                try {
                    desc = abi.parseError(body.error.data);
                    break;
                } catch (parseErr) {
                    // no matching custom error found in abi, do nothing
                }
            }
        }
    }

    if (e.error && e.error.data) {
        for (const abi of abis) {
            try {
                desc = abi.parseError(e.error.data);
                break;
            } catch (parseErr) {
                // no matching custom error found in abi, do nothing
            }
        }
    }

    return { raw: e, code: e.code, msg: reason, description: desc, transaction: e.transaction };
}
