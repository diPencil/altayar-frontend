import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from '@react-native-picker/picker';
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";
import Toast from "../../src/components/Toast";

const COLORS = {
  primary: "#0891b2",
  background: "#f0f9ff",
  white: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  lightGray: "#e2e8f0",
  success: "#10b981",
  error: "#ef4444",
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

export default function PersonalInfoScreen() {
  const { isRTL, language } = useLanguage();
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const [formData, setFormData] = useState({
    username: user?.username || "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    gender: user?.gender || "MALE",
    country: user?.country || "Egypt",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: user.gender || "MALE",
        country: user.country || "Egypt",
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/auth/me', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        gender: formData.gender,
        country: formData.country,
      });
      await refreshUser();
      await refreshUser();
      showToast(t('profile.updateSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || t('profile.updateError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('profile.personalInfo')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {t('profile.username')}
            </Text>
            <TextInput
              style={[styles.input, styles.inputDisabled, isRTL && styles.inputRTL]}
              value={formData.username}
              editable={false}
              textAlign={isRTL ? 'right' : 'left'}
            />
            <Text style={[styles.hint, isRTL && styles.textRTL]}>
              {t('profile.usernameImmutable')}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {t('profile.firstName')}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              value={formData.first_name}
              onChangeText={(text) => setFormData({ ...formData, first_name: text })}
              placeholder={t('profile.enterFirstName')}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {t('profile.lastName')}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              value={formData.last_name}
              onChangeText={(text) => setFormData({ ...formData, last_name: text })}
              placeholder={t('profile.enterLastName')}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {t('common.email')}
            </Text>
            <TextInput
              style={[styles.input, styles.inputDisabled, isRTL && styles.inputRTL]}
              value={formData.email}
              editable={false}
              textAlign={isRTL ? 'right' : 'left'}
            />
            <Text style={[styles.hint, isRTL && styles.textRTL]}>
              {t('profile.emailImmutable')}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {t('auth.phone')}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder={t('auth.placeholders.phone')}
              keyboardType="phone-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {t('admin.manageUsers.gender') || 'Gender'}
            </Text>
            <View style={[styles.radioGroup, isRTL && styles.rowRTL]}>
              {['MALE', 'FEMALE'].map(g => (
                <TouchableOpacity
                  key={g}
                  style={styles.radioBtn}
                  onPress={() => setFormData({ ...formData, gender: g })}
                >
                  <Ionicons
                    name={formData.gender === g ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={COLORS.primary}
                  />
                  <Text style={styles.radioText}>
                    {g === 'MALE' ? (t('admin.manageUsers.male') || 'Male') : (t('admin.manageUsers.female') || 'Female')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {t('admin.manageUsers.country') || 'Country'}
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.country}
                onValueChange={(value: string) => setFormData({ ...formData, country: value })}
                style={[styles.picker, isRTL && styles.pickerRTL]}
                dropdownIconColor={COLORS.primary}
              >
                {COUNTRIES.map(countryName => (
                  <Picker.Item key={countryName} label={countryName} value={countryName} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveBtnText}>
              {t('profile.saveChanges')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
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
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
  form: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
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
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  inputRTL: {
    textAlign: "right",
  },
  inputDisabled: {
    backgroundColor: COLORS.lightGray,
    color: COLORS.textLight,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  radioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioText: {
    fontSize: 14,
    color: COLORS.text,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  pickerContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    justifyContent: 'center',
    height: 55,
  },
  picker: {
    width: '100%',
    color: COLORS.text,
  },
  pickerRTL: {
    textAlign: 'right',
  },
});
