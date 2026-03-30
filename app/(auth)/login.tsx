import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Redirect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";

const COLORS = {
  primary: "#1071b8",
  primaryDark: "#0e7490",
  background: "#f0f9ff",
  white: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  error: "#ef4444",
};

export default function LoginScreen() {
  const { t } = useTranslation();
  const { isRTL, toggleLanguage, language } = useLanguage();
  const { login, isAuthenticated, isLoading, user } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Clear error as user types
    if (error) setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identifier, password]);

  // If auth state already resolved and user is logged in, bounce to root (it will redirect by role)
  if (!isLoading && isAuthenticated && user) {
    return <Redirect href="/" />;
  }

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setError(t("auth.errors.fillAll"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await login(identifier.trim(), password);
      if (!result.success) {
        setError(result.error || t("auth.errors.loginFailed"));
        return;
      }
      router.replace("/");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View
        entering={FadeIn.duration(800)}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
              <Image
                source={{ uri: "https://customer-assets.emergentagent.com/job_viptraveller/artifacts/hsqancxd_altayarlogo.png" }}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.welcomeText}>{t("auth.welcomeBack")}</Text>
              <Text style={styles.subtitleText}>{t("auth.signInToContinue")}</Text>
            </LinearGradient>

            <View style={styles.formContainer}>
              {error ? (
                <View style={[styles.errorBox]}>
                  <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                  <Text style={[styles.errorText, isRTL && styles.errorTextRTL]}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>{t("common.emailOrUsername")}</Text>
                <View style={[styles.inputContainer]}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textLight} />
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder={t("auth.emailOrUsernamePlaceholder")}
                    placeholderTextColor={COLORS.textLight}
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textAlign={isRTL ? "right" : "left"}
                    editable={!submitting}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>{t("common.password")}</Text>
                <View style={[styles.inputContainer]}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} />
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder={t("common.password")}
                    placeholderTextColor={COLORS.textLight}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    textAlign={isRTL ? "right" : "left"}
                    editable={!submitting}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(v => !v)}
                    disabled={submitting}
                  >
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.forgotBtn, isRTL && styles.forgotBtnRTL]}
                onPress={() => router.push("/(auth)/forgot-password")}
                disabled={submitting}
              >
                <Text style={[styles.forgotText, isRTL && styles.textRTL]}>{t("auth.forgotPassword")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginBtn, submitting && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.loginBtnText}>{t("common.login")}</Text>
                )}
              </TouchableOpacity>

              <View style={[styles.footerRow]}>
                <Text style={[styles.footerText, isRTL && styles.textRTL]}>{t("auth.noAccount")}</Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/register")} disabled={submitting}>
                  <Text style={styles.footerLink}>{t("common.register")}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.languageContainer}>
                <TouchableOpacity
                  style={[styles.languagePill]}
                  onPress={toggleLanguage}
                  disabled={submitting}
                >
                  <Ionicons name="globe-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.languagePillText}>
                    {language === "ar" ? "English" : "العربية"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 16,
    borderBottomStartRadius: 30,
    borderBottomEndRadius: 30,
  },
  logoImage: {
    height: 70,
    width: 180,
    alignSelf: "center",
    marginTop: 18,
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.white,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginTop: 6,
  },
  textRTL: {
    textAlign: "right",
  },
  formContainer: {
    marginTop: -18,
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },

  errorText: {
    marginStart: 8,
    color: COLORS.error,
    fontWeight: "600",
    flex: 1,
  },
  errorTextRTL: {
    marginStart: 0,
    marginEnd: 8,
    textAlign: "right",
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginStart: 10,
    writingDirection: "ltr",
  },
  inputRTL: {
    marginStart: 0,
    marginEnd: 10,
    writingDirection: "rtl",
  },
  eyeBtn: {
    padding: 4,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: 2,
    marginBottom: 14,
  },
  forgotBtnRTL: {
    alignSelf: "flex-start",
  },
  forgotText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },

  footerText: {
    color: COLORS.textLight,
    fontSize: 13,
    textAlign: "center",
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  languageContainer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  languagePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 8,
  },

  languagePillText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },
});

