/**
 * Calculates the total BLOX (volume units) used in a build.
 * Each brick's volume = width × depth (height is constant at 1.0)
 */
export function calculateTotalBlox(bricks: Array<{ width: number; depth: number }>): number {
  return bricks.reduce((total, brick) => {
    return total + brick.width * brick.depth
  }, 0)
}
