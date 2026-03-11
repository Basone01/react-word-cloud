import { describe, it, expect } from 'vitest';
import { computeLayout } from '../src/layout';
import type { Word } from '../src/types';

const defaultOptions = {
  width: 600,
  height: 400,
  center: { x: 300, y: 200 },
  shape: 'elliptic' as const,
  removeOverflowing: false,
  fontSizes: [12, 60] as [number, number],
};

describe('computeLayout', () => {
  it('returns empty array for empty words', () => {
    expect(computeLayout([], [], defaultOptions)).toEqual([]);
  });

  it('all same-weight words get weight class 5 (midpoint) and mid font size', () => {
    const words: Word[] = [
      { text: 'a', weight: 5 },
      { text: 'b', weight: 5 },
      { text: 'c', weight: 5 },
    ];
    const rects = words.map(() => ({ width: 50, height: 20 }));
    const result = computeLayout(words, rects, defaultOptions);

    result.forEach(pos => {
      expect(pos).not.toBeNull();
      expect(pos!.weightClass).toBe(5);
      // With same weights, font size should be mid (fontSizes[0])
      expect(pos!.fontSize).toBe(defaultOptions.fontSizes[0]);
    });
  });

  it('highest-weight word is placed first (closest to center)', () => {
    const words: Word[] = [
      { text: 'small', weight: 1 },
      { text: 'huge', weight: 10 },
    ];
    const rects = [{ width: 40, height: 15 }, { width: 100, height: 40 }];
    const result = computeLayout(words, rects, defaultOptions);

    const hugePos = result[1]!;
    const smallPos = result[0]!;

    expect(hugePos).not.toBeNull();
    expect(smallPos).not.toBeNull();

    // Highest weight word should be closer to center
    const distHuge = Math.hypot(
      hugePos.left + rects[1]!.width / 2 - defaultOptions.center.x,
      hugePos.top + rects[1]!.height / 2 - defaultOptions.center.y
    );
    const distSmall = Math.hypot(
      smallPos.left + rects[0]!.width / 2 - defaultOptions.center.x,
      smallPos.top + rects[0]!.height / 2 - defaultOptions.center.y
    );

    expect(distHuge).toBeLessThanOrEqual(distSmall);
  });

  it('words with removeOverflowing that cant fit return null', () => {
    // Tiny container, large words → should return null
    const words: Word[] = [
      { text: 'word1', weight: 5 },
      { text: 'word2', weight: 5 },
      { text: 'word3', weight: 5 },
    ];
    const rects = words.map(() => ({ width: 200, height: 100 }));
    const result = computeLayout(words, rects, {
      ...defaultOptions,
      width: 50,
      height: 50,
      center: { x: 25, y: 25 },
      removeOverflowing: true,
    });

    // All words should overflow and be null
    result.forEach(pos => {
      expect(pos).toBeNull();
    });
  });

  it('elliptic: placed words do not overlap', () => {
    const words: Word[] = Array.from({ length: 10 }, (_, i) => ({
      text: `word${i}`,
      weight: i + 1,
    }));
    const rects = words.map(() => ({ width: 60, height: 20 }));
    const result = computeLayout(words, rects, {
      ...defaultOptions,
      removeOverflowing: false,
    });

    const placed = result
      .map((pos, i) => pos ? { ...pos, ...rects[i]! } : null)
      .filter(Boolean) as Array<{ left: number; top: number; width: number; height: number }>;

    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i]!;
        const b = placed[j]!;
        const aCx = a.left + a.width / 2;
        const aCy = a.top + a.height / 2;
        const bCx = b.left + b.width / 2;
        const bCy = b.top + b.height / 2;
        const noOverlap =
          Math.abs(aCx - bCx) >= (a.width + b.width) / 2 ||
          Math.abs(aCy - bCy) >= (a.height + b.height) / 2;
        expect(noOverlap).toBe(true);
      }
    }
  });

  it('rectangular: placed words do not overlap', () => {
    const words: Word[] = Array.from({ length: 8 }, (_, i) => ({
      text: `word${i}`,
      weight: i + 1,
    }));
    const rects = words.map(() => ({ width: 60, height: 20 }));
    const result = computeLayout(words, rects, {
      ...defaultOptions,
      shape: 'rectangular',
      removeOverflowing: false,
    });

    const placed = result
      .map((pos, i) => pos ? { ...pos, ...rects[i]! } : null)
      .filter(Boolean) as Array<{ left: number; top: number; width: number; height: number }>;

    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i]!;
        const b = placed[j]!;
        const aCx = a.left + a.width / 2;
        const aCy = a.top + a.height / 2;
        const bCx = b.left + b.width / 2;
        const bCy = b.top + b.height / 2;
        const noOverlap =
          Math.abs(aCx - bCx) >= (a.width + b.width) / 2 ||
          Math.abs(aCy - bCy) >= (a.height + b.height) / 2;
        expect(noOverlap).toBe(true);
      }
    }
  });
});
