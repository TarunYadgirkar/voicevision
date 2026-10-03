// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCommandRunner } from '@/hooks/useCommandRunner';
import { defaultFilterState } from '@/types';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('command recovery', () => {
  it('does not send an unknown command until cloud parsing is enabled', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const { result } = renderHook(() => useCommandRunner({ getState: () => defaultFilterState, onCommand: vi.fn() }));
    await act(async () => { await result.current.run('something unusual'); });
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/controls|cloud/i);
  });
  it('ignores a late reply after reset cancels interpretation', async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(r => { resolve = r; })));
    const apply = vi.fn();
    const { result } = renderHook(() => useCommandRunner({ getState: () => defaultFilterState, onCommand: apply }));
    act(() => result.current.setAllowCloud(true));
    let pending!: Promise<void>;
    act(() => { pending = result.current.run('something unusual'); });
    act(() => result.current.clearHistory());
    await act(async () => { resolve(Response.json({ reset: false, darkMode: true })); await pending; });
    expect(apply).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(false);
  });
  it('does not apply invalid model settings', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ reset: false, brightness: 88 })));
    const apply = vi.fn();
    const { result } = renderHook(() => useCommandRunner({ getState: () => defaultFilterState, onCommand: apply }));
    act(() => result.current.setAllowCloud(true));
    await act(async () => { await result.current.run('something unusual'); });
    expect(apply).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/valid|understand/i);
  });
  it('spoken undo restores the previous adjustment instead of resetting all', async () => {
    const apply = vi.fn();
    const undo = vi.fn();
    const { result } = renderHook(() => useCommandRunner({ getState: () => defaultFilterState, onCommand: apply, onUndo: undo }));
    await act(async () => { await result.current.run('undo'); });
    expect(undo).toHaveBeenCalledOnce();
    expect(apply).not.toHaveBeenCalled();
  });
});
