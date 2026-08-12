/**
 * Global mx object available in Mendix runtime.
 *
 * This is a LOCAL declaration that does NOT conflict with the `mendix` package.
 * The `mendix` package only provides prop-value types (ReferenceValue, ListValue,
 * ActionValue, etc.). The runtime `window.mx` object is declared here so the
 * data-API adapters can access `window.mx.data`.
 */
export {};

declare global {
    interface Window {
        mx: {
            data: MxData;
            platform: unknown;
            ui: unknown;
            version: string;
        };
    }
}

interface MxData {
    load(options: MxLoadOptions): void;
    action(options: MxActionOptions): void;
    list(options: MxListOptions): void;
    get(options: MxGetOptions): void;
    create(options: MxCreateOptions): void;
    update(options: MxUpdateOptions): void;
    remove(options: MxRemoveOptions): void;
    commit(options: MxCommitOptions): void;
}

interface MxLoadOptions {
    guid: string;
    callback: (obj: unknown) => void;
    error?: (error: Error) => void;
}

interface MxGetOptions {
    guid: string;
    callback: (obj: unknown) => void;
    error?: (error: Error) => void;
}

interface MxActionOptions {
    params: Record<string, unknown>;
    callback?: (result: unknown) => void;
    error?: (error: Error) => void;
}

interface MxListOptions {
    xpath: string;
    callback: (items: unknown[]) => void;
    error?: (error: Error) => void;
    limit?: number;
    sort?: string;
}

interface MxCreateOptions {
    params: {
        entity: string;
        values?: Record<string, unknown>;
    };
    callback: (obj: unknown) => void;
    error?: (error: Error) => void;
}

interface MxUpdateOptions {
    params: {
        entity: string;
        guid: string;
        values?: Record<string, unknown>;
    };
    callback: (obj: unknown) => void;
    error?: (error: Error) => void;
}

interface MxRemoveOptions {
    guid: string;
    callback?: () => void;
    error?: (error: Error) => void;
}

interface MxCommitOptions {
    callback?: () => void;
    error?: (error: Error) => void;
}
