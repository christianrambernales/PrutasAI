import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../utils/theme';

export default function CameraScreen({ navigation }) {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleScan = async () => {
    if (!imageUri) return;
    setLoading(true);
    try {
      const result = await api.scanImage(token, imageUri);
      navigation.navigate('Result', { scan: result.scan });
    } catch (error) {
      console.error('Scan Error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('scan')}</Text>

      {/* Image Preview & Distance Guidance Overlay */}
      <View style={styles.previewContainer}>
        {imageUri ? (
          <>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <View style={styles.distanceOverlay}>
              <View style={styles.distanceIndicator}>
                <Text style={styles.distanceText}>✨ {t('optimalDistance')}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.guidanceBox}>
              <Text style={styles.guidanceText}>{t('distanceGuidance')}</Text>
              <View style={styles.targetFrame} />
            </View>
            <Text style={styles.placeholderIcon}>🍊</Text>
            <Text style={styles.placeholderText}>{t('takePhoto')}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
          <Text style={styles.captureBtnIcon}>📷</Text>
          <Text style={styles.captureBtnText}>{t('camera')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.galleryBtn} onPress={pickImage}>
          <Text style={styles.galleryBtnIcon}>🖼️</Text>
          <Text style={styles.galleryBtnText}>{t('gallery')}</Text>
        </TouchableOpacity>
      </View>

      {/* Scan Button */}
      {imageUri && (
        <TouchableOpacity
          style={[styles.scanBtn, loading && { opacity: 0.6 }]}
          onPress={handleScan}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.scanBtnText}>{t('scanning')}</Text>
            </>
          ) : (
            <Text style={styles.scanBtnText}>{t('scan')} 🔍</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  title: { fontSize: FONTS.sizes.title, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  previewContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  preview: { width: '100%', height: '100%', resizeMode: 'contain' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 64, marginBottom: SPACING.md },
  placeholderText: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary },
  actions: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  captureBtn: {
    flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
  },
  captureBtnIcon: { fontSize: 20 },
  captureBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },
  galleryBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: COLORS.primary,
    padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
  },
  galleryBtnIcon: { fontSize: 20 },
  galleryBtnText: { color: COLORS.primary, fontSize: FONTS.sizes.md, fontWeight: '700' },
  scanBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, padding: SPACING.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },
  scanBtnText: { color: '#fff', fontSize: FONTS.sizes.xl, fontWeight: '800' },
  distanceOverlay: {
    position: 'absolute', top: 20, left: 0, right: 0, alignItems: 'center',
  },
  distanceIndicator: {
    backgroundColor: 'rgba(64, 145, 108, 0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  distanceText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  guidanceBox: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center',
  },
  guidanceText: {
    position: 'absolute', top: 40, color: COLORS.primary, fontWeight: 'bold', fontSize: 18,
  },
  targetFrame: {
    width: '70%', height: '50%', borderWidth: 2, borderColor: 'rgba(26, 71, 42, 0.3)', borderStyle: 'dashed', borderRadius: 20,
  },
});
