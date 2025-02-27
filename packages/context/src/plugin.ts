import { Context } from './context';

export type Plugin = {
    install(context: Context): void;
};
