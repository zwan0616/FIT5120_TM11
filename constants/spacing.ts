/**
 * NutriHealth Design System - Spacing Scale
 * 
 * Consistent spacing scale for layouts and components.
 * Base: 16px = 1rem
 */

export const Spacing = {
  // Micro spacing
  xs: 4,      // 0.25rem
  sm: 8,      // 0.5rem
  md: 12,     // 0.75rem
  
  // Standard spacing
  base: 16,   // 1rem
  lg: 20,     // 1.25rem
  xl: 24,     // 1.5rem
  xxl: 32,    // 2rem
  
  // Macro spacing
  '2xl': 32,  // 2rem
  '3xl': 40,  // 2.5rem
  '4xl': 48,  // 3rem
  '5xl': 64,  // 4rem
  '6xl': 80,  // 5rem
  
  // Named spacing for semantic purposes
  spacing_1: 4,
  spacing_2: 8,
  spacing_3: 12,
  spacing_4: 16,
  spacing_5: 20,
  spacing_6: 32,   // 2rem - Important for display type breathing room
  spacing_7: 40,
  spacing_8: 48,
  spacing_9: 64,
  spacing_10: 80,
} as const;

/**
 * Component-specific spacing presets
 */
export const ComponentSpacing = {
  // Button padding
  button: {
    vertical: Spacing.md,
    horizontal: Spacing.xl,
  },
  
  // Card padding
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  
  // Screen padding
  screen: {
    horizontal: Spacing.lg,
    vertical: Spacing.xl,
  },
  
  // Section spacing
  section: {
    gap: Spacing['2xl'],
  },
  
  // List item spacing
  listItem: {
    gap: Spacing.md,
    padding: Spacing.base,
  },
} as const;

/**
 * Gap presets for flex/grid layouts
 */
export const Gap = {
  none: 0,
  xs: Spacing.xs,
  sm: Spacing.sm,
  md: Spacing.md,
  lg: Spacing.lg,
  xl: Spacing.xl,
} as const;