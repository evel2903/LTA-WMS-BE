import { ExecutionContext } from '@nestjs/common';
import { TestingModuleBuilder } from '@nestjs/testing';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';

/**
 * Test helper: neutralizes the C2 auth/permission guards for controller E2E specs that
 * boot a bare `Test.createTestingModule` (no AuthenticationModule, no AccessControlModule).
 * JwtAuthGuard is replaced by a stub that injects a test user; PermissionGuard is allowed.
 * Use for specs asserting controller/validation behavior, NOT enforcement (see
 * AccessControl.EnforcementE2ESpec for the real-guard enforcement proof).
 */
export const overrideAccessGuards = (builder: TestingModuleBuilder, userId = 'test-admin'): TestingModuleBuilder =>
  builder
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest<{ user?: unknown }>();
        request.user = { UserId: userId, Role: 'Admin' };
        return true;
      },
    })
    .overrideGuard(PermissionGuard)
    .useValue({ canActivate: () => true });
