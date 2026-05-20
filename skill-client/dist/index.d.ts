export interface RNALinkConfig {
    apiKey?: string;
    serverUrl?: string;
    localPath?: string;
}
export interface BootstrapRequest {
    agent_id: string;
    message: string;
    max_tokens?: number;
}
export interface BootstrapResponse {
    injection: string;
    tasks?: any[];
}
export interface QueryRequest {
    space: string;
    filters?: any;
}
export interface Fact {
    id: string;
    space_id?: string;
    content: string;
    type: string;
    tags?: string[];
    created_at?: string;
}
export interface StoreRequest {
    space: string;
    content: string;
    type: string;
    tags?: string[];
}
export interface ErrorData {
    command: string;
    error: string;
    solution_tried?: string;
    status?: string;
}
export interface SuccessData {
    command: string;
    result: string;
}
export declare class RNALink {
    private apiKey;
    private serverUrl;
    private localPath;
    constructor(config?: RNALinkConfig);
    private request;
    private saveLocal;
    store(req: StoreRequest): Promise<{
        id: string;
    }>;
    bootstrap(req: BootstrapRequest): Promise<BootstrapResponse>;
    query(req: QueryRequest): Promise<Fact[]>;
    learnFromError(req: ErrorData): Promise<void>;
    learnFromSuccess(req: SuccessData): Promise<void>;
    suggestFix(errorMsg: string): Promise<string[]>;
}
export declare const rnaLink: RNALink;
