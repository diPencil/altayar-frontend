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
  flexDirection: isRTL ? 'row-reverse' : 'row',
});

/**
 * Creates a textAlign style that adapts to RTL
 */
export const rtlTextAlign = (isRTL: boolean): TextStyle => ({
  textAlign: isRTL ? 'right' : 'left',
});

/**
 * Creates marginStart (marginLeft in LTR, marginRight in RTL)
 */
export const rtlMarginStart = (value: number, isRTL: boolean): ViewStyle => ({
  [isRTL ? 'marginRight' : 'marginLeft']: value,
});

/**
 * Creates marginEnd (marginRight in LTR, marginLeft in RTL)
 */
export const rtlMarginEnd = (value: number, isRTL: boolean): ViewStyle => ({
  [isRTL ? 'marginLeft' : 'marginRight']: value,
});

/**
 * Creates paddingStart (paddingLeft in LTR, paddingRight in RTL)
 */
export const rtlPaddingStart = (value: number, isRTL: boolean): ViewStyle => ({
  [isRTL ? 'paddingRight' : 'paddingLeft']: value,
});

/**
 * Creates paddingEnd (paddingRight in LTR, paddingLeft in RTL)
 */
export const rtlPaddingEnd = (value: number, isRTL: boolean): ViewStyle => ({
  [isRTL ? 'paddingLeft' : 'paddingRight']: value,
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
