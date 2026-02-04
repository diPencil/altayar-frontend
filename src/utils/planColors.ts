/**
 * Utility functions for membership plan colors
 * Ensures consistent color mapping across the entire application
 */

import { COLORS } from './theme';

/**
 * Extract short code from tier_code (e.g., "VM-CLUB MEMBER" -> "VM")
 */
export function getShortCode(tierCode: string | undefined, fullName: string | undefined): string {
  if (!tierCode) return fullName || "??";
  
  // If tier_code contains "-", take the part before it
  if (tierCode.includes('-')) {
    return tierCode.split('-')[0].trim();
  }
  
  // If tier_code is short (2-4 chars), use it as is
  if (tierCode.length <= 4) {
    return tierCode.toUpperCase();
  }
  
  // Otherwise, try to extract meaningful abbreviation
  // For "VM-CLUB MEMBER" -> "VM", "BM-CLUB MEMBER" -> "BM"
  const parts = tierCode.split(/[-_\s]/);
  if (parts.length > 0 && parts[0].length <= 4) {
    return parts[0].toUpperCase();
  }
  
  // Fallback: use first 2-3 characters
  return tierCode.substring(0, 3).toUpperCase();
}

/**
 * Get color based on tier code if color_hex is not provided or invalid
 * This ensures consistent colors across all pages
 */
export function getPlanColor(
  tierCode: string | undefined, 
  colorHex: string | undefined, 
  shortCode?: string
): string {
  // Use short code for color matching (most reliable)
  const codeToCheck = (shortCode || getShortCode(tierCode, undefined)).toLowerCase();
  
  // Match based on short code first - this is the most reliable way
  if (codeToCheck === 'vm' || codeToCheck === 'vp' || codeToCheck === 'vip') {
    return '#10B981'; // Green/VIP
  }
  if (codeToCheck === 'bm' || codeToCheck === 'business') {
    return '#EF4444'; // Red/Business
  }
  
  // Check if color_hex is valid (not null, not empty, not undefined)
  // Only use it if short code matching didn't work
  if (colorHex && colorHex.trim() && colorHex !== 'null' && colorHex !== 'undefined') {
    return colorHex.trim();
  }
  
  // Fallback to full tier_code matching
  const fullCodeLower = (tierCode || '').toLowerCase();
  if (fullCodeLower.includes('silver')) return '#C0C0C0'; // Silver
  if (fullCodeLower.includes('gold')) return '#FFD700'; // Gold
  if (fullCodeLower.includes('platinum')) return '#8B5CF6'; // Purple/Platinum
  if (fullCodeLower.includes('vip') || fullCodeLower.includes('vp') || fullCodeLower.startsWith('vm')) {
    return '#10B981'; // Green/VIP
  }
  if (fullCodeLower.includes('diamond')) return '#3B82F6'; // Light Blue/Diamond
  if (fullCodeLower.includes('business') || fullCodeLower.startsWith('bm')) {
    return '#EF4444'; // Red/Business
  }
  
  return COLORS.primary; // Default primary color
}
