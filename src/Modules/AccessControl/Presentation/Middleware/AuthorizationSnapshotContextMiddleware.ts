import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuthorizationSnapshotContext } from '@modules/AccessControl/Application/Services/AuthorizationSnapshotContext';

@Injectable()
export class AuthorizationSnapshotContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: AuthorizationSnapshotContext) {}

  public use(_request: Request, _response: Response, next: NextFunction): void {
    this.requestContext.Run(() => next());
  }
}
