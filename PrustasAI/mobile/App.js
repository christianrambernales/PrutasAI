import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </LanguageProvider>
    </AuthProvider>
  );
}
