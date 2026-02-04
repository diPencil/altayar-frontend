import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS } from '../utils/theme';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
    onHide: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, visible, onHide, duration = 3000 }) => {
    const { isRTL } = useLanguage();
    const translateY = React.useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        if (visible) {
            // Slide down
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }).start();

            // Auto hide after duration
            const timer = setTimeout(() => {
                hideToast();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const hideToast = () => {
        Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            onHide();
        });
    };

    if (!visible) return null;

    const getBackgroundColor = () => {
        switch (type) {
            case 'success':
                return COLORS.success;
            case 'error':
                return COLORS.error;
            case 'info':
                return COLORS.primary;
            default:
                return COLORS.success;
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return 'checkmark-circle';
            case 'error':
                return 'close-circle';
            case 'info':
                return 'information-circle';
            default:
                return 'checkmark-circle';
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                isRTL && styles.containerRTL,
                {
                    backgroundColor: getBackgroundColor(),
                    transform: [{ translateY }],
                },
            ]}
        >
            <Ionicons name={getIcon()} size={24} color="white" />
            <Text style={[styles.message, isRTL && styles.messageRTL]}>{message}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 9999,
    },
    message: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
        marginRight: 0,
        flex: 1,
    },
    containerRTL: {
        flexDirection: 'row-reverse',
    },
    messageRTL: {
        marginLeft: 0,
        marginRight: 12,
        textAlign: 'right',
    },
});

export default Toast;
