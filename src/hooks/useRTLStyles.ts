import { useMemo } from 'react';
import { StyleSheet, ViewStyle, TextStyle, I18nManager } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

type Style = ViewStyle | TextStyle;
type StyleRecord = Record<string, Style>;

// Helper to flip horizontal properties for RTL
const flipStyle = (style: Style): Style => {
  const flipped: any = { ...style };
  
  // Flip margins
  if ('marginLeft' in style) {
    flipped.marginRight = style.marginLeft;
    delete flipped.marginLeft;
  }
  if ('marginRight' in style) {
    flipped.marginLeft = style.marginRight;
    delete flipped.marginRight;
  }
  
  // Flip paddings
  if ('paddingLeft' in style) {
    flipped.paddingRight = style.paddingLeft;
    delete flipped.paddingLeft;
  }
  if ('paddingRight' in style) {
    flipped.paddingLeft = style.paddingRight;
    delete flipped.paddingRight;
  }
  
  // Flip absolute positions
  if ('left' in style) {
    flipped.right = style.left;
    delete flipped.left;
  }
  if ('right' in style) {
    flipped.left = style.right;
    delete flipped.right;
  }
  
  // Flip flexDirection
  if (style.flexDirection === 'row') {
    flipped.flexDirection = 'row-reverse';
  } else if (style.flexDirection === 'row-reverse') {
    flipped.flexDirection = 'row';
  }
  
  // Flip text alignment
  if ((style as TextStyle).textAlign === 'left') {
    (flipped as TextStyle).textAlign = 'right';
  } else if ((style as TextStyle).textAlign === 'right') {
    (flipped as TextStyle).textAlign = 'left';
  }
  
  return flipped;
};

export function useRTLStyles<T extends StyleRecord>(styles: T): T {
  const { isRTL } = useLanguage();
  
  return useMemo(() => {
    if (!isRTL) return styles;
    
    const flippedStyles: any = {};
    
    for (const key in styles) {
      flippedStyles[key] = flipStyle(styles[key]);
    }
    
    return flippedStyles as T;
  }, [styles, isRTL]);
}

// Simple RTL-aware style helper
export const rtlStyle = (isRTL: boolean) => ({
  row: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
  } as ViewStyle,
  textAlign: {
    textAlign: isRTL ? 'right' : 'left',
  } as TextStyle,
  marginStart: (value: number) => ({
    [isRTL ? 'marginRight' : 'marginLeft']: value,
  }) as ViewStyle,
  marginEnd: (value: number) => ({
    [isRTL ? 'marginLeft' : 'marginRight']: value,
  }) as ViewStyle,
  paddingStart: (value: number) => ({
    [isRTL ? 'paddingRight' : 'paddingLeft']: value,
  }) as ViewStyle,
  paddingEnd: (value: number) => ({
    [isRTL ? 'paddingLeft' : 'paddingRight']: value,
  }) as ViewStyle,
});
