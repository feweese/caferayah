/**
 * Utilities for standardizing order and order item processing
 * These functions provide consistent data normalization across the application
 */

// Define consistent interfaces for order data
interface ProcessedAddon {
  id: string;
  name: string;
  price: number;
}

interface OrderItemRaw {
  id: string;
  productId?: string;
  product?: {
    id?: string;
    name?: string;
    images?: string[];
  };
  name?: string;
  price: number;
  quantity: number;
  size: string | any;
  temperature: string | any;
  addons?: Array<any> | string | null;
  addonsJson?: string | null;
  processedAddons?: Array<any>;
}

export interface ProcessedOrderItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  size: string;
  sizeFormatted: string;
  temperature: string;
  temperatureFormatted: string;
  addons: ProcessedAddon[];
  totalPrice: number;
}

/**
 * Process raw order item data into a standardized format
 * Handles different data formats and normalizes values
 */
export function processOrderItem(item: OrderItemRaw): ProcessedOrderItem {
  // Extract product ID and name
  const productId = item.productId || item.product?.id || 'unknown';
  const productName = item.product?.name || item.name || 'Unknown Product';

  // Normalize size
  let size = typeof item.size === 'string' ? item.size : String(item.size || 'SIXTEEN_OZ');
  size = size.toUpperCase();
  const sizeFormatted = size === 'SIXTEEN_OZ' ? '16oz' : '22oz';

  // Normalize temperature
  let temperature = 'ICED'; // Default fallback
  if (item.temperature) {
    if (typeof item.temperature === 'string') {
      temperature = item.temperature;
    } else if (typeof item.temperature === 'object') {
      temperature = String(item.temperature);
    } else {
      temperature = String(item.temperature);
    }
  }
  temperature = temperature.toUpperCase();
  const temperatureFormatted = temperature.includes('HOT') ? 'Hot' : 'Iced';

  // Process addons consistently
  const addons = processAddons(item);

  // Calculate total price (price * quantity)
  const totalPrice = item.price * item.quantity;

  return {
    id: item.id,
    productId,
    productName,
    price: item.price,
    quantity: item.quantity,
    size,
    sizeFormatted,
    temperature,
    temperatureFormatted,
    addons,
    totalPrice
  };
}

/**
 * Extract and process addons consistently regardless of the input format
 */
export function processAddons(item: OrderItemRaw): ProcessedAddon[] {
  // First check if processedAddons exists and is valid
  if (item.processedAddons && Array.isArray(item.processedAddons) && item.processedAddons.length > 0) {
    return normalizeAddonFormat(item.processedAddons);
  }
  
  // Try to parse from addons field
  if (item.addons) {
    if (Array.isArray(item.addons)) {
      return normalizeAddonFormat(item.addons);
    }
    
    if (typeof item.addons === 'string' && item.addons.trim() !== '' && item.addons !== '[]') {
      try {
        const parsed = JSON.parse(item.addons);
        return normalizeAddonFormat(Array.isArray(parsed) ? parsed : [parsed]);
      } catch (e) {
        console.error("Error parsing addons string:", e);
      }
    }
  }
  
  // Try from addonsJson as last resort
  if (item.addonsJson && item.addonsJson !== '[]' && item.addonsJson !== 'null') {
    try {
      const jsonStr = typeof item.addonsJson === 'string' ? item.addonsJson.replace(/\\/g, '') : JSON.stringify(item.addonsJson);
      const parsed = JSON.parse(jsonStr);
      return normalizeAddonFormat(Array.isArray(parsed) ? parsed : [parsed]);
    } catch (e) {
      console.error("Error parsing addonsJson:", e);
    }
  }
  
  return [];
}

/**
 * Normalize addon items to a consistent format
 */
function normalizeAddonFormat(addons: any[]): ProcessedAddon[] {
  return addons.map(addon => ({
    id: addon.id || `addon-${Math.random().toString(36).substring(2, 9)}`,
    name: addon.name || 'Add-on',
    price: typeof addon.price === 'number' ? addon.price : 0
  }));
}

/**
 * Format a list of addons into a readable string
 */
export function formatAddonsToString(addons: ProcessedAddon[]): string {
  return addons.map(addon => addon.name).join(', ');
}

/**
 * Process all items in an order
 */
export function processOrderItems(items: OrderItemRaw[]): ProcessedOrderItem[] {
  return items.map(item => processOrderItem(item));
}

/**
 * Check if an order item has any addons
 */
export function hasAddons(item: ProcessedOrderItem): boolean {
  return item.addons.length > 0;
} 