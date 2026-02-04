import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { I18nextProvider } from "react-i18next";
import i18n from "../src/i18n";
import { LanguageProvider } from "../src/contexts/LanguageContext";
import { AuthProvider } from "../src/contexts/AuthContext";
import { NotificationsProvider } from "../src/contexts/NotificationsContext";

import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <AuthProvider>
            <NotificationsProvider>
              <GestureHandlerRootView style={styles.container}>
                <StatusBar style="light" />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(user)" />
                  <Stack.Screen name="(admin)" />
                </Stack>
              </GestureHandlerRootView>
            </NotificationsProvider>
          </AuthProvider>
        </LanguageProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
