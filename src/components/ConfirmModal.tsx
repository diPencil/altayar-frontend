import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS } from '../utils/theme';

type ConfirmModalProps = {
    visible: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmModal({
    visible,
    title,
    message,
    type = 'info',
    confirmText,
    cancelText,
    loading = false,
    onConfirm,
    onCancel
}: ConfirmModalProps) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    const getTypeColor = () => {
        switch (type) {
            case 'danger': return COLORS.error;
            case 'warning': return COLORS.warning;
            case 'success': return COLORS.success;
            default: return COLORS.primary;
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'danger': return 'trash-outline';
            case 'warning': return 'warning-outline';
            case 'success': return 'checkmark-circle-outline';
            default: return 'help-circle-outline';
        }
    };

    const typeColor = getTypeColor();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: typeColor + '15' }]}>
                        <Ionicons name={getIcon() as any} size={40} color={typeColor} />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, isRTL && styles.textRTL]}>{title}</Text>

                    {/* Message */}
                    <Text style={[styles.message, isRTL && styles.textRTL]}>{message}</Text>

                    {/* Buttons */}
                    <View style={[styles.buttonRow]}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onCancel}
                            disabled={loading}
                        >
                            <Text style={styles.cancelButtonText}>
                                {cancelText || t("common.cancel") || "Cancel"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.confirmButton, { backgroundColor: typeColor }, loading && styles.buttonDisabled]}
                            onPress={onConfirm}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.confirmButtonText}>
                                    {confirmText || t("common.confirm") || "Confirm"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: COLORS.textLight,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },

    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: COLORS.border,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    textRTL: {
        textAlign: 'right',
    },
});
