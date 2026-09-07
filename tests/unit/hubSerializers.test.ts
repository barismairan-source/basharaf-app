import { describe, it, expect } from 'vitest';
import { sortVisibleHubItems } from '@/lib/db/hubSerializers';

function row(overrides: Partial<{ id: string; kind: string; label: string; url: string; isVisible: boolean; sortOrder: number }>) {
  return {
    id: 'x', kind: 'custom', label: 'لینک', url: '/x', isVisible: true, sortOrder: 0,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  } as any;
}

describe('sortVisibleHubItems', () => {
  it('drops hidden items', () => {
    const rows = [row({ id: 'a', isVisible: true }), row({ id: 'b', isVisible: false })];
    const result = sortVisibleHubItems(rows);
    expect(result.map(r => r.id)).toEqual(['a']);
  });

  it('sorts by sortOrder ascending regardless of input order', () => {
    const rows = [row({ id: 'c', sortOrder: 3 }), row({ id: 'a', sortOrder: 1 }), row({ id: 'b', sortOrder: 2 })];
    const result = sortVisibleHubItems(rows);
    expect(result.map(r => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty list when every item is hidden', () => {
    const rows = [row({ isVisible: false }), row({ isVisible: false })];
    expect(sortVisibleHubItems(rows)).toEqual([]);
  });
});
