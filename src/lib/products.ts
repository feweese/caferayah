/**
 * Utility functions for product management
 */

/**
 * Formats a product image path to ensure it's a valid URL
 * If the image path is already a full URL (starts with http), return it as is
 * Otherwise, assume it's a relative path and ensure it has the correct format
 * 
 * @param imagePath - The path to the product image
 * @returns The properly formatted image URL
 */
export function getImagePath(imagePath: string): string {
  // If the image already starts with http(s), it's already a full URL
  if (imagePath && imagePath.match(/^https?:\/\//)) {
    return imagePath;
  }

  // If it's not empty but not a full URL, assume it's a relative path
  if (imagePath && imagePath.trim() !== '') {
    // Ensure it starts with a slash
    if (!imagePath.startsWith('/')) {
      return `/${imagePath}`;
    }
    return imagePath;
  }

  // Default placeholder image if no valid path is provided
  return '/images/placeholder.jpg';
} 