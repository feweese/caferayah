/**
 * Price calculation utilities for consistent pricing across the application
 */

export interface AddonItem {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  price: number;
  quantity: number;
  addons?: Array<AddonItem> | string | null;
  processedAddons?: Array<AddonItem>;
  addonsJson?: string | null;
}

export interface Order {
  items: OrderItem[];
  deliveryAddress?: string;
  addressLine1?: string;
  paymentMethod: string;
  pointsUsed?: number;
  deliveryFee?: number;
  subtotal?: number;
  total?: number;
}

/**
 * Safely parse addons from various formats
 */
export function parseAddons(item: OrderItem): AddonItem[] {
  // First check if processedAddons exists
  if (item.processedAddons && Array.isArray(item.processedAddons) && item.processedAddons.length > 0) {
    return item.processedAddons;
  }
  
  // Try to parse from addons field
  if (item.addons) {
    if (Array.isArray(item.addons)) {
      return item.addons;
    }
    
    if (typeof item.addons === 'string' && item.addons.trim() !== '' && item.addons !== '[]') {
      try {
        const parsed = JSON.parse(item.addons);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        console.error("Error parsing addons string:", e);
      }
    }
  }
  
  // Try from addonsJson as last resort
  if (item.addonsJson && item.addonsJson !== '[]' && item.addonsJson !== 'null') {
    try {
      const parsed = JSON.parse(item.addonsJson);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error("Error parsing addonsJson:", e);
    }
  }
  
  return [];
}

/**
 * Check if an item has any addons
 */
export function hasAddons(item: OrderItem): boolean {
  return parseAddons(item).length > 0;
}

/**
 * Calculate total price for a single item including addons
 * NOTE: In most cases, the item.price already includes addons, so we don't add them again
 */
export function calculateItemTotal(item: OrderItem): number {
  // Simply use the base price * quantity as the addons are already included
  return item.price * item.quantity;
}

/**
 * Calculate subtotal for all items in an order
 */
export function calculateSubtotal(order: Order | null): number {
  if (!order) return 0;
  
  // If the order has a predefined subtotal, use that
  if (order.subtotal !== undefined && order.subtotal !== null) {
    return order.subtotal;
  }
  
  // Otherwise calculate from items
  if (!order.items || !Array.isArray(order.items)) return 0;
  
  return order.items.reduce((total, item) => {
    return total + calculateItemTotal(item);
  }, 0);
}

/**
 * Determine if delivery fee applies
 */
export function hasDeliveryFee(order: Order | null): boolean {
  if (!order) return false;
  
  const isCOD = order.paymentMethod?.toUpperCase()?.includes('DELIVERY') || 
                order.paymentMethod?.toLowerCase() === 'cod';
  
  return !!(order.deliveryAddress || order.addressLine1 || isCOD);
}

/**
 * Calculate the final total including delivery fee and points discount
 * IMPORTANT: This must match exactly how the cart calculates totals
 */
export function calculateTotal(order: Order | null): number {
  if (!order) return 0;
  
  // Always recalculate using the exact formula from the cart page
  const subtotal = order.subtotal || calculateSubtotal(order);
  const deliveryFee = hasDeliveryFee(order) ? (order.deliveryFee || 50) : 0;
  const pointsDiscount = order.pointsUsed || 0;
  
  // Directly calculate using the cart's formula
  return subtotal + deliveryFee - pointsDiscount;
}

/**
 * Format price in PHP format
 */
export function formatPricePHP(price: number): string {
  return `₱${price.toFixed(2)}`;
} 