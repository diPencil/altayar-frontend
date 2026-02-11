import { ViewStyle, TextStyle } from 'react-native';

/**
 * RTL-aware style helpers
 * Use these functions to create styles that automatically adapt to RTL/LTR
 */

export interface RTLStyleOptions {
  isRTL: boolean;
}

/**
 * Creates a flexDirection style that adapts to RTL
 */
export const rtlRow = (isRTL: boolean): ViewStyle => ({
  flexDirection: 'row',
});

/**
 * Creates a textAlign style that adapts to RTL
 */
export const rtlTextAlign = (isRTL: boolean): TextStyle => ({
  textAlign: isRTL ? 'right' : 'left',
});

/**
 * Creates marginStart (marginStart in LTR, marginEnd in RTL)
 */
export const rtlMarginStart = (value: number, isRTL: boolean): ViewStyle => ({
  [isRTL ? 'marginEnd' : 'marginStart']: value,
});

/**
 * Creates marginEnd (marginEnd in LTR, marginStart in RTL)
 */
export const rtlMarginEnd = (value: number, isRTL: boolean): ViewStyle => ({
  [isRTL ? 'marginStart' : 'marginEnd']: value,
});

/**
 * Creates paddingStart (paddingStart in LTR, paddingEnd in RTL)
 */
export const rtlPaddingStart = (value: number, isRTL: boolean): ViewStyle => ({
  [isRTL ? 'paddingEnd' : 'paddingStart']: value,
});

/**
 * Creates paddingEnd (paddingEnd in LTR, paddingStart in RTL)
 */
export const rtlPaddingEnd = (value: number, isRTL: boolean): ViewStyle => ({
  [isRTL ? 'paddingStart' : 'paddingEnd']: value,
});

/**
 * Creates position style for absolute positioning (left/right flip)
 */
export const rtlPosition = (
  left: number | undefined,
  right: number | undefined,
  isRTL: boolean
): ViewStyle => {
  if (isRTL) {
    return {
      left: right,
      right: left,
    };
  }
  return {
    left,
    right,
  };
};

/**
 * Creates a complete RTL-aware style object
 */
export const rtlStyle = (isRTL: boolean) => ({
  row: rtlRow(isRTL),
  textAlign: rtlTextAlign(isRTL),
  marginStart: (value: number) => rtlMarginStart(value, isRTL),
  marginEnd: (value: number) => rtlMarginEnd(value, isRTL),
  paddingStart: (value: number) => rtlPaddingStart(value, isRTL),
  paddingEnd: (value: number) => rtlPaddingEnd(value, isRTL),
  position: (left?: number, right?: number) => rtlPosition(left, right, isRTL),
});
