import { I18nManager } from 'react-native';

/**
 * RTL Utility Functions
 * Provides helpers for RTL-aware styling
 */

export const getRTLFlexDirection = (isRTL: boolean, defaultDirection: 'row' | 'column' = 'row') => {
    if (defaultDirection === 'column') return 'column';
    return isRTL ? 'row-reverse' : 'row';
};

export const getRTLTextAlign = (isRTL: boolean, defaultAlign: 'left' | 'center' | 'right' = 'left') => {
    if (defaultAlign === 'center') return 'center';
    if (defaultAlign === 'left') return isRTL ? 'right' : 'left';
    if (defaultAlign === 'right') return isRTL ? 'left' : 'right';
    return defaultAlign;
};

export const getRTLMargin = (isRTL: boolean, left: number = 0, right: number = 0) => {
    return isRTL ? { marginStart: right, marginEnd: left } : { marginStart: left, marginEnd: right };
};

export const getRTLPadding = (isRTL: boolean, left: number = 0, right: number = 0) => {
    return isRTL ? { paddingStart: right, paddingEnd: left } : { paddingStart: left, paddingEnd: right };
};

export const getRTLPosition = (isRTL: boolean, left?: number, right?: number) => {
    if (left !== undefined && right !== undefined) {
        return isRTL ? { left: right, right: left } : { left, right };
    }
    if (left !== undefined) {
        return isRTL ? { right: left } : { left };
    }
    if (right !== undefined) {
        return isRTL ? { left: right } : { right };
    }
    return {};
};

export const getRTLTransform = (isRTL: boolean) => {
    return isRTL ? [{ scaleX: -1 }] : [];
};

// Check if RTL is enabled
export const isRTLEnabled = () => {
    return I18nManager.isRTL;
};
