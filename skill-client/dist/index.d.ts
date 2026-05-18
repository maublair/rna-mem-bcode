export interface RNALinkConfig {
    apiKey?: string;
    serverUrl?: string;
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
    constructor(config?: RNALinkConfig);
    private request;
    bootstrap(req: BootstrapRequest): Promise<BootstrapResponse>;
    query(req: QueryRequest): Promise<Fact[]>;
    store(req: StoreRequest): Promise<{
        id: string;
    }>;
    learnFromError(req: ErrorData): Promise<void>;
    learnFromSuccess(req: SuccessData): Promise<void>;
    suggestFix(errorMsg: string): Promise<string[]>;
}
export declare const rnaLink: RNALink;
