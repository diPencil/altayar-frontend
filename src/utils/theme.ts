/**
 * Theme colors for Altayar App
 * Central location for all app colors including gradients
 */

export const COLORS = {
  // Primary Colors
  primary: "#1a74c6", // Main primary color
  primaryLight: "#0cb5e9", // Light variant for gradients

  // Status Colors
  success: "#0cb5e9", // Changed from green to blue
  warning: "#f59e0b",
  error: "#ef4444",

  // UI Colors
  background: "rgba(0,0,0,0.5)",
  cardBg: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",

  // Additional UI Colors
  backgroundLight: "#f8fafc",
  borderLight: "#e5e7eb",
  textMuted: "#94a3b8",
  textSecondary: "#475569",
  shadow: "#000",
  white: "#ffffff",

  // Plan Colors (unchanged)
  vip: "#10B981",
  business: "#EF4444",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#8B5CF6",
  diamond: "#3B82F6",
} as const;

/**
 * Gradient definitions for buttons and UI elements
 */
export const GRADIENTS = {
  primary: {
    start: COLORS.primary,
    end: COLORS.primaryLight,
  },
  success: {
    start: COLORS.success,
    end: "#1e88e5", // Slightly darker blue for gradient
  },
} as const;

/**
 * Get gradient colors for a specific type
 */
export function getGradientColors(type: 'primary' | 'success' = 'primary') {
  return GRADIENTS[type];
}

export default COLORS;