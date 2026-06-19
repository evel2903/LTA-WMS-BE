import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

/**
 * Stamps every request with a correlation id (reused from the inbound `x-correlation-id`
 * header when present) and a fresh request id, and echoes the correlation id on the
 * response. The audit context decorator reads these off the request.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  public use(req: Request, res: Response, next: NextFunction): void {
    const inbound = req.headers['x-correlation-id'];
    const correlationId = typeof inbound === 'string' && inbound.length > 0 ? inbound : randomUUID();
    (req as Request & { correlationId?: string; requestId?: string }).correlationId = correlationId;
    (req as Request & { correlationId?: string; requestId?: string }).requestId = randomUUID();
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
