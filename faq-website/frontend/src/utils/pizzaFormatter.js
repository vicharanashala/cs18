/**
 * Utility to format raw pizza slice counts into a standardized string.
 * Example:
 * 0 -> "0 slices"
 * 4 -> "4 slices"
 * 6 -> "1 Pizza"
 * 13 -> "2 Pizzas + 1 slice"
 */
export function formatPizzas(totalSlices) {
  if (totalSlices === undefined || totalSlices === null) return '0 slices';
  
  const pizzas = Math.floor(totalSlices / 6);
  const remainingSlices = totalSlices % 6;
  
  if (pizzas === 0) {
    return `${remainingSlices} slice${remainingSlices !== 1 ? 's' : ''}`;
  }
  
  const pizzaStr = `${pizzas} Pizza${pizzas > 1 ? 's' : ''}`;
  
  if (remainingSlices === 0) {
    return pizzaStr;
  }
  
  return `${pizzaStr} + ${remainingSlices} slice${remainingSlices !== 1 ? 's' : ''}`;
}
