import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
beforeEach(() => vi.resetModules());
it('caps total requests even when callers rotate forwarded headers', async () => {
  const { checkRateLimit } = await import('@/app/api/interpret/rateLimit');
  let limited = false;
  for (let i = 0; i < 101; i++) {
    const result = checkRateLimit(new NextRequest('https://voicevision.test/api/interpret', { headers: { 'x-forwarded-for': `client-${i}` } }));
    limited ||= result.limited;
  }
  expect(limited).toBe(true);
});
it('still limits repeated requests from one caller', async () => {
  const { checkRateLimit } = await import('@/app/api/interpret/rateLimit');
  const request = new NextRequest('https://voicevision.test/api/interpret');
  for (let i = 0; i < 20; i++) expect(checkRateLimit(request).limited).toBe(false);
  expect(checkRateLimit(request).limited).toBe(true);
});
