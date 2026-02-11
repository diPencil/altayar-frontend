import React, { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from '@react-native-picker/picker';
import { router } from "expo-router";
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
  success: "#10b981",
};

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia",
  "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius",
  "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { isRTL, toggleLanguage, language } = useLanguage();
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("MALE");
  const [country, setCountry] = useState("Egypt");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const validateForm = () => {
    if (!username || !firstName || !lastName || !email || !password || !confirmPassword) {
      setError(t('auth.errors.fillAll'));
      return false;
    }
    if (password !== confirmPassword) {
      setError(t('auth.security.errors.mismatch'));
      return false;
    }
    if (password.length < 8) {
      setError(t('auth.security.errors.minChars'));
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError(t('auth.security.errors.uppercase'));
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setError(t('auth.security.errors.lowercase'));
      return false;
    }
    if (!/\d/.test(password)) {
      setError(t('auth.security.errors.digit'));
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    const result = await register({
      username,
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      phone: phone || undefined,
      gender,
      country,
      language: language,
      referral_code: referralCode || undefined,
    });

    setLoading(false);

    if (result.success) {
      router.replace("/(user)");
    } else {
      setError(result.error || t('auth.errors.registrationFailed'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.header}
          >
            <View style={[styles.headerTop, isRTL && styles.headerTopRTL]}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.back()}
              >
                <Ionicons
                  name={isRTL ? "arrow-forward" : "arrow-back"}
                  size={24}
                  color={COLORS.white}
                />
              </TouchableOpacity>


            </View>

            <Image
              source={{ uri: 'https://customer-assets.emergentagent.com/job_viptraveller/artifacts/hsqancxd_altayarlogo.png' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.welcomeText}>
              {t("auth.createAccount")}
            </Text>
          </LinearGradient>

          {/* Form */}
          <View style={styles.formContainer}>
            {error ? (
              <View style={[styles.errorBox, isRTL && styles.errorBoxRTL]}>
                <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={[styles.errorText, isRTL && styles.errorTextRTL]}>{error}</Text>
              </View>
            ) : null}

            {/* Name Row */}
            <View style={[styles.nameRow, isRTL && styles.nameRowRTL]}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {t('auth.firstName')} *
                </Text>
                <View style={[
                  styles.inputContainer,
                  isRTL && styles.inputContainerRTL,
                  focusedField === 'firstName' && styles.inputContainerFocused
                ]}>
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                    placeholder={t('auth.placeholders.firstName')}
                    placeholderTextColor={COLORS.textLight}
                    value={firstName}
                    onChangeText={setFirstName}
                    textAlign={isRTL ? "right" : "left"}
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={{ width: 12 }} />

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {t('auth.lastName')} *
                </Text>
                <View style={[
                  styles.inputContainer,
                  isRTL && styles.inputContainerRTL,
                  focusedField === 'lastName' && styles.inputContainerFocused
                ]}>
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                    placeholder={t('auth.placeholders.lastName')}
                    placeholderTextColor={COLORS.textLight}
                    value={lastName}
                    onChangeText={setLastName}
                    textAlign={isRTL ? "right" : "left"}
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                {t('auth.username')} *
              </Text>
              <View style={[
                styles.inputContainer,
                isRTL && styles.inputContainerRTL,
                focusedField === 'username' && styles.inputContainerFocused
              ]}>
                <Ionicons name="person-outline" size={20} color={COLORS.textLight} />
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                  placeholder={t('auth.placeholders.username')}
                  placeholderTextColor={COLORS.textLight}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  textAlign={isRTL ? "right" : "left"}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>{t("common.email")} *</Text>
              <View style={[
                styles.inputContainer,
                isRTL && styles.inputContainerRTL,
                focusedField === 'email' && styles.inputContainerFocused
              ]}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textLight} />
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                  placeholder="email@example.com"
                  placeholderTextColor={COLORS.textLight}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign={isRTL ? "right" : "left"}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>{t("auth.phone")}</Text>
              <View style={[
                styles.inputContainer,
                isRTL && styles.inputContainerRTL,
                focusedField === 'phone' && styles.inputContainerFocused
              ]}>
                <Ionicons name="call-outline" size={20} color={COLORS.textLight} />
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                  placeholder="+20 1xx xxx xxxx"
                  placeholderTextColor={COLORS.textLight}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  textAlign={isRTL ? "right" : "left"}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                {t('auth.gender')}
              </Text>
              <View style={[styles.inputContainer, isRTL && styles.inputContainerRTL]}>
                <Ionicons name="person-outline" size={20} color={COLORS.textLight} />
                <Picker
                  selectedValue={gender}
                  onValueChange={(value: string) => setGender(value)}
                  style={[styles.picker, isRTL && styles.pickerRTL]}
                >
                  <Picker.Item label={t('auth.male')} value="MALE" />
                  <Picker.Item label={t('auth.female')} value="FEMALE" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                {t('auth.country')}
              </Text>
              <View style={[styles.inputContainer, isRTL && styles.inputContainerRTL]}>
                <Ionicons name="location-outline" size={20} color={COLORS.textLight} />
                <Picker
                  selectedValue={country}
                  onValueChange={(value: string) => setCountry(value)}
                  style={[styles.picker, isRTL && styles.pickerRTL]}
                >
                  {COUNTRIES.map(countryName => (
                    <Picker.Item key={countryName} label={countryName} value={countryName} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Referral Code */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>{isRTL ? 'كود الإحالة (اختياري)' : 'Referral Code (Optional)'}</Text>
              <View style={[
                styles.inputContainer,
                isRTL && styles.inputContainerRTL,
                focusedField === 'referralCode' && styles.inputContainerFocused
              ]}>
                <Ionicons name="gift-outline" size={20} color={COLORS.textLight} />
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                  placeholder="e.g. REF-12345"
                  placeholderTextColor={COLORS.textLight}
                  value={referralCode}
                  onChangeText={setReferralCode}
                  autoCapitalize="characters"
                  textAlign={isRTL ? "right" : "left"}
                  onFocus={() => setFocusedField('referralCode')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>{t("common.password")} *</Text>
              <View style={[
                styles.inputContainer,
                isRTL && styles.inputContainerRTL,
                focusedField === 'password' && styles.inputContainerFocused
              ]}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} />
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textAlign={isRTL ? "right" : "left"}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>{t("auth.confirmPassword")} *</Text>
              <View style={[
                styles.inputContainer,
                isRTL && styles.inputContainerRTL,
                focusedField === 'confirmPassword' && styles.inputContainerFocused
              ]}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} />
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textLight}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  textAlign={isRTL ? "right" : "left"}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Password Requirements */}
            <View style={styles.requirements}>
              <RequirementItem
                met={password.length >= 8}
                text={t('auth.security.requirements.minChars')}
                isRTL={isRTL}
              />
              <RequirementItem
                met={/[A-Z]/.test(password)}
                text={t('auth.security.requirements.uppercase')}
                isRTL={isRTL}
              />
              <RequirementItem
                met={/[a-z]/.test(password)}
                text={t('auth.security.requirements.lowercase')}
                isRTL={isRTL}
              />
              <RequirementItem
                met={/\d/.test(password)}
                text={t('auth.security.requirements.digit')}
                isRTL={isRTL}
              />
            </View>

            <TouchableOpacity
              style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.registerBtnText}>{t("common.register")}</Text>
              )}
            </TouchableOpacity>

            <View style={[styles.loginRow, isRTL && styles.loginRowRTL]}>
              <Text style={styles.loginText}>{t("auth.haveAccount")} </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={styles.loginLink}>{t("common.login")}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.languageContainer}>
              <TouchableOpacity
                style={styles.languagePill}
                onPress={toggleLanguage}
                disabled={loading}
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
    </SafeAreaView>
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
      <Text style={[
        styles.requirementText,
        met && styles.requirementMet,
        isRTL && styles.requirementTextRTL
      ]}>
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
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 16,
    borderBottomStartRadius: 30,
    borderBottomEndRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  headerTopRTL: {
    flexDirection: 'row-reverse',
  },
  backBtn: {
    padding: 4,
  },

  logoImage: {
    width: 130,
    height: 45,
    alignSelf: "center",
    marginTop: 18,
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
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
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorBoxRTL: {
    flexDirection: "row-reverse",
  },
  errorText: {
    color: COLORS.error,
    marginStart: 8,
    flex: 1,
  },
  errorTextRTL: {
    marginStart: 0,
    marginEnd: 8,
    textAlign: "right",
  },
  nameRow: {
    flexDirection: "row",
  },
  nameRowRTL: {
    flexDirection: "row-reverse",
  },
  halfWidth: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "transparent",
    overflow: "hidden",
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  inputContainerRTL: {
    flexDirection: "row-reverse",
  },
  input: {
    flex: 1,
    marginStart: 12,
    fontSize: 16,
    color: COLORS.text,
    writingDirection: "ltr",
  },
  inputRTL: {
    marginStart: 0,
    marginEnd: 12,
    writingDirection: "rtl",
  },
  requirements: {
    marginBottom: 20,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
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
  registerBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  registerBtnDisabled: {
    opacity: 0.7,
  },
  registerBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "600",
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  loginRowRTL: {
    flexDirection: "row-reverse",
  },
  loginText: {
    color: COLORS.textLight,
  },
  loginLink: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  picker: {
    flex: 1,
    color: COLORS.text,
  },
  pickerRTL: {
    textAlign: "right",
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
