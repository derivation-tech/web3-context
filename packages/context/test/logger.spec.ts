import { LoggerFactory } from '../src';

describe('Logger test', function () {
    it('info test', async function () {
        LoggerFactory.getLogger('test').info('123123', { aaa: 'aaa' });
    });
});
