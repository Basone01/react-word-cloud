import type { Word } from './types';

export interface WordRect {
  width: number;
  height: number;
}

export interface WordPosition {
  left: number;
  top: number;
  fontSize: number;
  weightClass: number;
}

interface PlacedRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function overlaps(a: PlacedRect, b: PlacedRect): boolean {
  const aCenterX = a.left + a.width / 2;
  const aCenterY = a.top + a.height / 2;
  const bCenterX = b.left + b.width / 2;
  const bCenterY = b.top + b.height / 2;
  return (
    Math.abs(aCenterX - bCenterX) < (a.width + b.width) / 2 &&
    Math.abs(aCenterY - bCenterY) < (a.height + b.height) / 2
  );
}

function isOutOfBounds(rect: PlacedRect, width: number, height: number): boolean {
  return (
    rect.left < 0 ||
    rect.top < 0 ||
    rect.left + rect.width > width ||
    rect.top + rect.height > height
  );
}

export function computeLayout(
  words: Word[],
  rects: WordRect[],
  options: {
    width: number;
    height: number;
    center: { x: number; y: number };
    shape: 'elliptic' | 'rectangular';
    removeOverflowing: boolean;
    fontSizes: [number, number];
  }
): (WordPosition | null)[] {
  if (words.length === 0) return [];

  const { width, height, center, shape, removeOverflowing, fontSizes } = options;
  const aspectRatio = width / height;

  // Sort by weight descending, keeping original indices
  const indexed = words.map((w, i) => ({ word: w, rect: rects[i]!, index: i }));
  indexed.sort((a, b) => b.word.weight - a.word.weight);

  const weights = words.map(w => w.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const weightRange = maxWeight - minWeight;

  function getFontSize(weight: number): number {
    if (weightRange === 0) return fontSizes[0];
    return fontSizes[0] + ((weight - minWeight) / weightRange) * (fontSizes[1] - fontSizes[0]);
  }

  function getWeightClass(weight: number): number {
    if (weightRange === 0) return 5;
    return Math.round(((weight - minWeight) / weightRange) * 9) + 1;
  }

  const result: (WordPosition | null)[] = new Array(words.length).fill(null);
  const placed: PlacedRect[] = [];

  for (let i = 0; i < indexed.length; i++) {
    const { word, rect, index } = indexed[i]!;
    const fontSize = getFontSize(word.weight);
    const weightClass = getWeightClass(word.weight);
    const w = rect.width;
    const h = rect.height;

    let left = center.x - w / 2;
    let top = center.y - h / 2;

    if (shape === 'elliptic') {
      let radius = 0;
      let angle = 0;
      let placed_flag = false;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const candidate: PlacedRect = { left, top, width: w, height: h };
        const hasCollision = placed.some(p => overlaps(candidate, p));

        if (!hasCollision) {
          if (removeOverflowing && isOutOfBounds(candidate, width, height)) {
            result[index] = null;
          } else {
            result[index] = { left, top, fontSize, weightClass };
            placed.push(candidate);
          }
          placed_flag = true;
          break;
        }

        radius += 2.0;
        angle += (i % 2 === 0 ? 1 : -1) * 2.0;
        left = center.x - w / 2 + radius * Math.cos(angle) * aspectRatio;
        top = center.y - h / 2 + radius * Math.sin(angle);

        // Safety: if spiral goes way out of bounds, stop
        if (radius > Math.max(width, height) * 2) {
          break;
        }
      }

      if (!placed_flag) {
        result[index] = null;
      }
    } else {
      // Rectangular spiral
      let step = 18.0;
      let steps_in_direction = 0;
      let quarter_turns = 0;
      let direction = 0; // 0=right, 1=down, 2=left, 3=up
      const dx = [1, 0, -1, 0];
      const dy = [0, 1, 0, -1];
      const directionStepSize = [step * aspectRatio, step, step * aspectRatio, step];

      let placed_flag = false;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const candidate: PlacedRect = { left, top, width: w, height: h };
        const hasCollision = placed.some(p => overlaps(candidate, p));

        if (!hasCollision) {
          if (removeOverflowing && isOutOfBounds(candidate, width, height)) {
            result[index] = null;
          } else {
            result[index] = { left, top, fontSize, weightClass };
            placed.push(candidate);
          }
          placed_flag = true;
          break;
        }

        steps_in_direction++;
        left += dx[direction]! * directionStepSize[direction]!;
        top += dy[direction]! * directionStepSize[direction]!;

        const stepsBeforeTurn = Math.floor(quarter_turns / 2) + 1;
        if (steps_in_direction >= stepsBeforeTurn) {
          steps_in_direction = 0;
          quarter_turns++;
          direction = quarter_turns % 4;
        }

        // Safety limit
        if (quarter_turns > (width + height) / step * 4) {
          break;
        }
      }

      if (!placed_flag) {
        result[index] = null;
      }
    }
  }

  return result;
}
