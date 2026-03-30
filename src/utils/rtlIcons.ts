import type { StyleProp, TextStyle } from 'react-native';

/** Substrings of Ionicons names that read directionally (should mirror in RTL). */
const DIRECTIONAL_PATTERNS = [
  'airplane',
  'trending',
  'navigate',
  'pricetag',
  'flash',
];

/**
 * Returns `transform: scaleX(-1)` for directional icons when UI is RTL
 * so arrows / planes / trends match reading direction.
 */
export function rtlMirroredIconStyle(
  ioniconName: string,
  isRTL: boolean
): StyleProp<TextStyle> | undefined {
  if (!isRTL) return undefined;
  const n = String(ioniconName).toLowerCase();
  if (DIRECTIONAL_PATTERNS.some((p) => n.includes(p))) {
    return { transform: [{ scaleX: -1 }] };
  }
  return undefined;
}
