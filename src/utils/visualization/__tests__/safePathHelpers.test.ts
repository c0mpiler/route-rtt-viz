/**
 * Unit tests for safePathHelpers
 */
import { 
  isValidCoordinate, 
  getSafeCoordinates, 
  generateSafePath,
  getSafePointAlongQuadCurve
} from '../safePathHelpers';

describe('isValidCoordinate', () => {
  test('returns true for valid coordinates', () => {
    expect(isValidCoordinate(0, 0)).toBe(true);
    expect(isValidCoordinate(10.5, -20.3)).toBe(true);
  });
  
  test('returns false for NaN values', () => {
    expect(isValidCoordinate(NaN, 0)).toBe(false);
    expect(isValidCoordinate(0, NaN)).toBe(false);
    expect(isValidCoordinate(NaN, NaN)).toBe(false);
  });
  
  test('returns false for infinity', () => {
    expect(isValidCoordinate(Infinity, 0)).toBe(false);
    expect(isValidCoordinate(0, -Infinity)).toBe(false);
  });
  
  test('returns false for non-number values', () => {
    expect(isValidCoordinate('10' as any, 0)).toBe(false);
    expect(isValidCoordinate(0, undefined as any)).toBe(false);
    expect(isValidCoordinate(null as any, 0)).toBe(false);
  });
});

describe('getSafeCoordinates', () => {
  test('returns original coordinates when valid', () => {
    expect(getSafeCoordinates(10, 20)).toEqual([10, 20]);
  });
  
  test('returns fallback values for invalid coordinates', () => {
    expect(getSafeCoordinates(NaN, 20)).toEqual([0, 20]);
    expect(getSafeCoordinates(10, NaN)).toEqual([10, 0]);
    expect(getSafeCoordinates(NaN, NaN)).toEqual([0, 0]);
  });
  
  test('uses provided fallback values', () => {
    expect(getSafeCoordinates(NaN, NaN, 5, 15)).toEqual([5, 15]);
  });
});

describe('generateSafePath', () => {
  test('generates path for valid coordinates', () => {
    const path = generateSafePath({ x: 10, y: 10 }, { x: 20, y: 20 });
    expect(path).toMatch(/^M10,10 Q/);
    expect(path).toMatch(/20,20$/);
  });
  
  test('returns empty string for invalid source', () => {
    const path = generateSafePath({ x: NaN, y: 10 }, { x: 20, y: 20 });
    expect(path).toBe('');
  });
  
  test('returns empty string for invalid target', () => {
    const path = generateSafePath({ x: 10, y: 10 }, { x: NaN, y: 20 });
    expect(path).toBe('');
  });
  
  test('returns straight line for zero curvature', () => {
    const path = generateSafePath({ x: 10, y: 10 }, { x: 20, y: 20 }, 0);
    expect(path).toBe('M10,10 L20,20');
  });
  
  test('returns empty string for identical points', () => {
    const path = generateSafePath({ x: 10, y: 10 }, { x: 10, y: 10 });
    expect(path).toBe('');
  });
});

describe('getSafePointAlongQuadCurve', () => {
  test('calculates points correctly', () => {
    const point = getSafePointAlongQuadCurve(0.5, [0, 0], [10, 10], [20, 0]);
    expect(point[0]).toBeCloseTo(10);
    expect(point[1]).toBeCloseTo(5);
  });
  
  test('returns start point for t=0', () => {
    const point = getSafePointAlongQuadCurve(0, [5, 5], [10, 10], [15, 5]);
    expect(point[0]).toBe(5);
    expect(point[1]).toBe(5);
  });
  
  test('returns end point for t=1', () => {
    const point = getSafePointAlongQuadCurve(1, [5, 5], [10, 10], [15, 5]);
    expect(point[0]).toBe(15);
    expect(point[1]).toBe(5);
  });
  
  test('handles invalid t parameter', () => {
    const point = getSafePointAlongQuadCurve(NaN, [0, 0], [10, 10], [20, 0]);
    expect(point).toEqual([0, 0]);
  });
  
  test('handles invalid control points', () => {
    const point = getSafePointAlongQuadCurve(0.5, [0, 0], [NaN, 10], [20, 0]);
    expect(point).toEqual([0, 0]);
  });
  
  test('clamps t between 0 and 1', () => {
    const pointNegative = getSafePointAlongQuadCurve(-0.5, [0, 0], [10, 10], [20, 0]);
    expect(pointNegative[0]).toBe(0);
    expect(pointNegative[1]).toBe(0);
    
    const pointOver = getSafePointAlongQuadCurve(1.5, [0, 0], [10, 10], [20, 0]);
    expect(pointOver[0]).toBe(20);
    expect(pointOver[1]).toBe(0);
  });
});
