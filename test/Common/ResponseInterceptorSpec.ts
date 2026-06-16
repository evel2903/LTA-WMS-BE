import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ResponseInterceptor } from '../../src/Common/Interceptors/ResponseInterceptor';
import { OkResponse } from '../../src/Common/Responses/ApiResponse';

describe('ResponseInterceptor', () => {
  it('wraps plain data in OkResponse', async () => {
    const interceptor = new ResponseInterceptor();
    const context = {} as unknown as ExecutionContext;
    const handler: CallHandler = { handle: () => of({ A: 1 }) };
    const result$ = interceptor.intercept(context, handler);
    await expect(lastValueFrom(result$)).resolves.toEqual(OkResponse({ A: 1 }));
  });

  it('does not double-wrap ApiResponse', async () => {
    const interceptor = new ResponseInterceptor();
    const already = OkResponse({ A: 1 });
    const context = {} as unknown as ExecutionContext;
    const handler: CallHandler = { handle: () => of(already) };
    const result$ = interceptor.intercept(context, handler);
    await expect(lastValueFrom(result$)).resolves.toBe(already);
  });
});
