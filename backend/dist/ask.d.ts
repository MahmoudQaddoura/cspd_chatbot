import { Request, Response } from 'express';
/**
 * POST /ask
 * Accepts a query and streams the AI response.
 * Uses Server-Sent Events (SSE) for streaming.
 * Routes to KB search for service queries, direct response for general queries.
 */
export declare function askHandler(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=ask.d.ts.map