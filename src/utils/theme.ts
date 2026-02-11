/**
 * Theme colors for Altayar App
 * Central location for all app colors including gradients
 */

export const COLORS = {
  // Primary Colors - New Blue Scheme
  primary: "#1071b8", // Main blue
  secondary: "#167dc1", // Medium blue
  accent: "#0ba7df", // Light blue
  primaryLight: "#0ba7df", // Light variant for gradients

  // Status Colors
  success: "#10b981", // Green for success
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
    start: COLORS.primary, // #1071b8
    end: COLORS.accent, // #0ba7df
  },
  secondary: {
    start: COLORS.secondary, // #167dc1
    end: COLORS.accent, // #0ba7df
  },
  success: {
    start: COLORS.success,
    end: "#059669", // Darker green for gradient
  },
} as const;

/**
 * Get gradient colors for a specific type
 */
export function getGradientColors(type: 'primary' | 'success' = 'primary') {
  return GRADIENTS[type];
}

export default COLORS;