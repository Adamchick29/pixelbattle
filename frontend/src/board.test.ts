import { describe, expect, it } from 'vitest';
import { applyPixel, decodeSnapshot } from './board';
import type { Snapshot } from './board';
import { newPageId } from './api';

const blank: Snapshot = { type: 'board.snapshot', size: 256, pixels: btoa('\0'.repeat(65536)),
  palette: Array.from({ length: 32 }, () => '#FFFFFF'), revision: 0, cooldown_seconds: 5, server_time: 1 };

describe('live board synchronization', () => {
  it('decodes snapshots and applies sequential pixel changes without mutating the old board', () => {
    const board = decodeSnapshot(blank);
    const result = applyPixel(board, { type: 'pixel.changed', x: 255, y: 255, color: 14, revision: 1 });
    expect(result.board.pixels[65535]).toBe(14);
    expect(board.pixels[65535]).toBe(0);
    expect(result.needsSync).toBe(false);
  });
  it('requests a snapshot after a missing event, and ignores duplicate or old events', () => {
    const board = decodeSnapshot(blank);
    const next = applyPixel(board, { type: 'pixel.changed', x: 1, y: 1, color: 14, revision: 1 }).board;
    expect(applyPixel(next, { type: 'pixel.changed', x: 1, y: 1, color: 25, revision: 1 }).board).toBe(next);
    expect(applyPixel(next, { type: 'pixel.changed', x: 2, y: 2, color: 25, revision: 3 }).needsSync).toBe(true);
  });
  it('rejects malformed snapshots', () => {
    expect(() => decodeSnapshot({ ...blank, pixels: btoa('broken') })).toThrow();
  });
  it('generates page IDs on HTTP even without crypto.randomUUID', () => {
    const ids = Array.from({ length: 100 }, newPageId);
    expect(new Set(ids).size).toBe(100);
    expect(ids.every(id => /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/.test(id))).toBe(true);
  });
});
