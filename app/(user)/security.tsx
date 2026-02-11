import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { api } from "../../src/services/api";

const COLORS = {
  primary: "#1071b8",
  background: "#f0f9ff",
  white: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  lightGray: "#e2e8f0",
  success: "#10b981",
  error: "#ef4444",
};

export default function SecurityScreen() {
  const { isRTL, language } = useLanguage();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const validateForm = () => {
    const newErrors = { current_password: "", new_password: "", confirm_password: "" };
    let isValid = true;

    if (!formData.current_password) {
      newErrors.current_password = t('auth.security.errors.currentRequired');
      isValid = false;
    }

    if (!formData.new_password) {
      newErrors.new_password = t('auth.security.errors.newRequired');
      isValid = false;
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = t('auth.security.errors.minChars');
      isValid = false;
    } else if (!/[A-Z]/.test(formData.new_password)) {
      newErrors.new_password = t('auth.security.errors.uppercase');
      isValid = false;
    } else if (!/[a-z]/.test(formData.new_password)) {
      newErrors.new_password = t('auth.security.errors.lowercase');
      isValid = false;
    } else if (!/\d/.test(formData.new_password)) {
      newErrors.new_password = t('auth.security.errors.digit');
      isValid = false;
    }

    if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = t('auth.security.errors.mismatch');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      await api.post('/auth/change-password', {
        current_password: formData.current_password,
        new_password: formData.new_password,
      });

      Alert.alert(
        t('common.success'),
        t('auth.security.errors.success'),
        [{ text: t('common.ok'), onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.message || t('auth.security.errors.failed')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('auth.security.title')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Security Info */}
          <View style={[styles.infoCard, isRTL && styles.infoCardRTL]}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
            <Text style={[styles.infoText, isRTL && styles.textRTL]}>
              <Text style={[styles.infoText, isRTL && styles.textRTL]}>
                {t('auth.security.info')}
              </Text>
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('auth.security.changePassword')}
              </Text>
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {t('auth.security.currentPassword')}
                </Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, isRTL && styles.inputRTL]}
                  value={formData.current_password}
                  onChangeText={(text) => setFormData({ ...formData, current_password: text })}
                  placeholder={t('auth.security.enterCurrent')}
                  secureTextEntry={!showCurrentPassword}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Ionicons
                    name={showCurrentPassword ? "eye-off" : "eye"}
                    size={22}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.current_password ? (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.current_password}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {t('auth.security.newPassword')}
                </Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, isRTL && styles.inputRTL]}
                  value={formData.new_password}
                  onChangeText={(text) => setFormData({ ...formData, new_password: text })}
                  placeholder={t('auth.security.enterNew')}
                  secureTextEntry={!showNewPassword}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons
                    name={showNewPassword ? "eye-off" : "eye"}
                    size={22}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.new_password ? (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.new_password}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {t('auth.security.confirmPassword')}
                </Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, isRTL && styles.inputRTL]}
                  value={formData.confirm_password}
                  onChangeText={(text) => setFormData({ ...formData, confirm_password: text })}
                  placeholder={t('auth.security.reEnterNew')}
                  secureTextEntry={!showConfirmPassword}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={22}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirm_password ? (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.confirm_password}</Text>
              ) : null}
            </View>

            {/* Password Requirements */}
            <View style={styles.requirements}>
              <Text style={[styles.requirementsTitle, isRTL && styles.textRTL]}>
                {t('auth.security.requirements.title')}
              </Text>
              <RequirementItem
                met={formData.new_password.length >= 8}
                text={t('auth.security.requirements.minChars')}
                isRTL={isRTL}
              />
              <RequirementItem
                met={/[A-Z]/.test(formData.new_password)}
                text={t('auth.security.requirements.uppercase')}
                isRTL={isRTL}
              />
              <RequirementItem
                met={/[a-z]/.test(formData.new_password)}
                text={t('auth.security.requirements.lowercase')}
                isRTL={isRTL}
              />
              <RequirementItem
                met={/\d/.test(formData.new_password)}
                text={t('auth.security.requirements.digit')}
                isRTL={isRTL}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleChangePassword}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>
                <Text style={styles.saveBtnText}>
                  {t('auth.security.changePassword')}
                </Text>
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function RequirementItem({ met, text, isRTL }: { met: boolean; text: string; isRTL: boolean }) {
  return (
    <View style={[styles.requirementRow, isRTL && styles.requirementRowRTL]}>
      <Ionicons
        name={met ? "checkmark-circle" : "ellipse-outline"}
        size={16}
        color={met ? COLORS.success : COLORS.textLight}
      />
      <Text style={[styles.requirementText, isRTL && styles.requirementTextRTL, met && styles.requirementMet]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderBottomStartRadius: 30,
    borderBottomEndRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  headerRTL: {
    flexDirection: "row-reverse",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f7fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoCardRTL: {
    flexDirection: "row-reverse",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginStart: 12,
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  textRTL: {
    textAlign: "right",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  inputRTL: {
    textAlign: "right",
  },
  eyeBtn: {
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  requirements: {
    marginTop: 10,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  requirementRowRTL: {
    flexDirection: "row-reverse",
  },
  requirementText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginStart: 8,
  },
  requirementTextRTL: {
    marginStart: 0,
    marginEnd: 8,
  },
  requirementMet: {
    color: COLORS.success,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
