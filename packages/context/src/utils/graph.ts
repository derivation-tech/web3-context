import retry from 'async-retry';
import { BaseLogger, LoggerFactory, LogLevel } from '../logger';
import axios from 'axios';

export const GRAPH_PAGE_SIZE = 1000;

export interface GraphOptions {
    retries: number;
    onRetry: (error: Error) => void;
    logger?: BaseLogger;
    loggerLevel?: LogLevel;
}

export class Graph {
    endpoint: string;
    retryOption: any;
    logger: BaseLogger;

    constructor(endpoint: string, retryOption?: GraphOptions) {
        this.endpoint = endpoint;
        this._initLogger(retryOption);
        this.retryOption = retryOption ?? {
            retries: 3,
            onRetry: (error: Error): void => {
                this.logger.error('subgraph retrying on error:', error);
            },
        };
    }

    _initLogger(option?: GraphOptions) {
        if (option?.logger) {
            this.logger = option.logger;
            return;
        }
        if (option?.loggerLevel) {
            this.logger = LoggerFactory.getLogger('Graph', option.loggerLevel);
            return;
        }
        this.logger = LoggerFactory.getLogger('Graph');
    }

    // lastId is used for fetching a large number of entities
    // refer: https://thegraph.com/docs/en/querying/graphql-api/#example-using-first-and-id_ge
    async query(graphQL: string, skip: number, first: number, lastId = ''): Promise<any> {
        const graphql = JSON.stringify({
            query: `${graphQL}`,
            variables: lastId ? { first: first, lastID: lastId } : { skip: skip, first: first, lastID: lastId },
        });
        return retry(async () => {
            const response = await axios.post(this.endpoint, graphql, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 100000,
            });
            if (!response.data || response.data.errors) {
                this.logger.error('subgraph query error:', response.data);
                throw new Error('subgraph query error' + JSON.stringify(response.data.errors));
            }
            return response.data.data;
        }, this.retryOption);
    }

    async queryAll(graphQL: string, pageSize = GRAPH_PAGE_SIZE, pageByLastId = false): Promise<any[]> {
        const result: any[] = [];
        let data = await this.query(graphQL, 0, pageSize);
        if (!data) {
            return result;
        }
        const key = Object.keys(data)[0];
        let page = 1;
        this.logger.info(this.endpoint, 'page:', page, 'data-length:', data[key].length);
        while (data && data[key].length > 0) {
            result.push(...data[key]);
            // break if last page is not fully filled
            if (data[key].length < pageSize) {
                break;
            }
            if (pageByLastId) {
                const lastId = data[key][data[key].length - 1].id;
                if (!lastId) {
                    throw new Error(`pageByLastId is used, while id is missing in GraphQL statement: ${graphQL}`);
                }
                data = await this.query(graphQL, pageSize * page, pageSize, lastId);
            } else {
                data = await this.query(graphQL, pageSize * page, pageSize);
            }
            page += 1;
            this.logger.info(this.endpoint, 'page:', page, 'data-length:', data[key].length);
        }
        return result;
    }

    // get meta data of the graph
    // 1. current synced block number
    // 2. deploymentId
    // 3. has indexing errors or not
    async getMetaData() {
        const graphQL = `
        {
          _meta{
            block{
              number
            }
            deployment
            hasIndexingErrors
          }
        }`;
        return await this.query(graphQL, 0, GRAPH_PAGE_SIZE);
    }
}
