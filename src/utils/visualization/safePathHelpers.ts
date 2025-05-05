/**
 * Safe Path Helpers - Utilities for safely generating SVG paths
 * 
 * These functions prevent SVG path NaN errors by validating coordinates
 * and providing fallback behaviors for invalid data.
 */

/**
 * Validates if a coordinate pair is valid for SVG rendering
 * @param x - The x coordinate
 * @param y - The y coordinate
 * @returns True if coordinates are valid numbers
 */
export function isValidCoordinate(x: unknown, y: unknown): boolean {
  return typeof x === 'number' && 
         typeof y === 'number' && 
         !isNaN(x) && 
         !isNaN(y) && 
         isFinite(x) && 
         isFinite(y);
}

/**
 * Provides a fallback coordinate pair if original is invalid
 * @param x - Original x coordinate
 * @param y - Original y coordinate
 * @param fallbackX - Fallback x value (defaults to 0)
 * @param fallbackY - Fallback y value (defaults to 0)
 * @returns Valid coordinate pair
 */
export function getSafeCoordinates(
  x: number, 
  y: number, 
  fallbackX: number = 0, 
  fallbackY: number = 0
): [number, number] {
  return [
    isValidCoordinate(x, x) ? x : fallbackX,
    isValidCoordinate(y, y) ? y : fallbackY
  ];
}

/**
 * Generates an SVG path between two points with built-in validation
 * @param source - Source point {x, y}
 * @param target - Target point {x, y}
 * @param curvature - Curvature factor for path (0 = straight line)
 * @returns Valid SVG path string or empty string if points are invalid
 */
export function generateSafePath(
  source: { x: number, y: number }, 
  target: { x: number, y: number },
  curvature: number = 0.2
): string {
  // Early validation
  if (!source || !target) {
    console.warn('Missing source or target coordinates');
    return '';
  }
  
  // Validate coordinates
  if (!isValidCoordinate(source.x, source.y) || 
      !isValidCoordinate(target.x, target.y)) {
    console.warn('Invalid coordinates detected, skipping path generation', {
      source: { x: source.x, y: source.y },
      target: { x: target.x, y: target.y }
    });
    return '';
  }
  
  // Check if source and target are the same point
  const isSamePoint = source.x === target.x && source.y === target.y;
  if (isSamePoint) {
    return ''; // No need to draw a path to itself
  }
  
  // For straight lines (curvature = 0)
  if (curvature === 0) {
    return `M${source.x},${source.y} L${target.x},${target.y}`;
  }
  
  try {
    // Calculate the midpoint
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    
    // Early check for NaN in midpoint calculation
    if (!isValidCoordinate(midX, midY)) {
      console.warn('Invalid midpoint detected', { midX, midY, source, target });
      return ''; // Return empty path if midpoint is invalid
    }
    
    // Calculate the control point for the curve
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const normLength = Math.sqrt(dx * dx + dy * dy);
    
    // Guard against division by zero
    if (normLength === 0) {
      return `M${source.x},${source.y} L${target.x},${target.y}`;
    }
    
    // Calculate perpendicular offset for control point
    const offsetX = -dy * (curvature * normLength) / normLength;
    const offsetY = dx * (curvature * normLength) / normLength;
    
    const controlX = midX + offsetX;
    const controlY = midY + offsetY;
    
    // Final validation of calculated control point
    if (!isValidCoordinate(controlX, controlY)) {
      // Fall back to a straight line if control point is invalid
      return `M${source.x},${source.y} L${target.x},${target.y}`;
    }
    
    return `M${source.x},${source.y} Q${controlX},${controlY} ${target.x},${target.y}`;
  } catch (error) {
    console.error('Error generating SVG path', error);
    // Fall back to a straight line in case of any calculation errors
    return `M${source.x},${source.y} L${target.x},${target.y}`;
  }
}

/**
 * Validates point coordinates along a bezier curve
 * @param t - Interpolation parameter (0-1)
 * @param p0 - Start point [x, y]
 * @param p1 - Control point [x, y]
 * @param p2 - End point [x, y]
 * @returns Safe point or default [0,0] if calculation fails
 */
export function getSafePointAlongQuadCurve(
  t: number, 
  p0: [number, number], 
  p1: [number, number], 
  p2: [number, number]
): [number, number] {
  try {
    // Validate points
    if (!isValidCoordinate(p0[0], p0[1]) || 
        !isValidCoordinate(p1[0], p1[1]) || 
        !isValidCoordinate(p2[0], p2[1])) {
      return [0, 0];
    }
    
    // Validate t parameter
    if (typeof t !== 'number' || isNaN(t) || !isFinite(t)) {
      return [0, 0];
    }
    
    // Clamp t between 0 and 1
    const tClamped = Math.max(0, Math.min(1, t));
    
    // Quadratic Bezier formula: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    const mt = 1 - tClamped;
    const mt2 = mt * mt;
    const t2 = tClamped * tClamped;
    
    const x = mt2 * p0[0] + 2 * mt * tClamped * p1[0] + t2 * p2[0];
    const y = mt2 * p0[1] + 2 * mt * tClamped * p1[1] + t2 * p2[1];
    
    // Final validation of calculated point
    if (!isValidCoordinate(x, y)) {
      return [0, 0];
    }
    
    return [x, y];
  } catch (error) {
    console.error('Error calculating point along curve', error);
    return [0, 0];
  }
}

/**
 * Creates a D3 safe line generator that prevents NaN errors
 * @param lineGenerator - D3 line generator function
 * @returns Wrapped generator that filters invalid data points
 */
export function createSafeLineGenerator(lineGenerator: any) {
  return function(data: any[]) {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }
    
    // Filter out invalid data points
    const validData = data.filter(point => 
      point && isValidCoordinate(point.x, point.y));
    
    if (validData.length === 0) {
      return '';
    }
    
    try {
      return lineGenerator(validData) || '';
    } catch (error) {
      console.error('Error generating line path', error);
      return '';
    }
  };
}
