import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  UserId: string;
  EmailAddress?: string;
  Role?: string;
}

/**
 * Extracts the authenticated principal (`request.user`, populated by JwtAuthGuard).
 * Use cases that re-check entity-resident data scope need the actor's UserId.
 */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser | undefined => {
  const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
  return request.user;
});
