export declare const config: {
    openaiApiKey: string | undefined;
    vectorStoreId: string | undefined;
    port: number;
    nodeEnv: string;
    openaiModel: string;
    langfuse: {
        enabled: boolean;
        secretKey: string | undefined;
        publicKey: string | undefined;
        baseUrl: string;
    };
};
export declare function validateConfig(): void;
//# sourceMappingURL=config.d.ts.map