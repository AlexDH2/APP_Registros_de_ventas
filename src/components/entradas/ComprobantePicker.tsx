import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, Trash2 } from 'lucide-react-native';
import { fonts } from '../../theme';

interface ComprobantePickerProps {
  image: ImagePicker.ImagePickerAsset | null;
  onImageChange: (image: ImagePicker.ImagePickerAsset | null) => void;
  theme: any;
  required?: boolean;
}

export default function ComprobantePicker({
  image,
  onImageChange,
  theme,
  required = false,
}: ComprobantePickerProps) {
  const tomarFotoCamara = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Denegado',
          'Se necesita acceso a la cámara para tomar la foto del comprobante.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        onImageChange(result.assets[0]);
      }
    } catch (err) {
      console.warn('Error al abrir cámara:', err);
      Alert.alert('Error', 'No se pudo abrir la cámara.');
    }
  };

  const elegirDeGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Denegado',
          'Se necesita permiso a la galería para seleccionar la captura.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        onImageChange(result.assets[0]);
      }
    } catch (err) {
      console.warn('Error al abrir galería:', err);
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.title, { color: theme.text }]}>
          Comprobante de Pago {required ? <Text style={styles.requiredAsterisk}>*</Text> : '(Opcional)'}
        </Text>
        {image && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onImageChange(null)}
          >
            <Trash2 size={14} color="#ef4444" />
            <Text style={styles.deleteText}>Quitar</Text>
          </TouchableOpacity>
        )}
      </View>

      {image ? (
        <View style={[styles.previewCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
          <Image source={{ uri: image.uri }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.previewInfo}>
            <Text style={[styles.previewTitle, { color: theme.text }]}>Comprobante cargado</Text>
            <Text style={[styles.previewSubtitle, { color: theme.textMuted }]}>
              Listo para registrar en la base de datos
            </Text>
            <View style={styles.changeActionRow}>
              <TouchableOpacity style={styles.changeAction} onPress={tomarFotoCamara}>
                <Camera size={13} color={theme.primary} />
                <Text style={[styles.changeActionText, { color: theme.primary }]}>Cambiar por Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.changeAction} onPress={elegirDeGaleria}>
                <ImageIcon size={13} color={theme.primary} />
                <Text style={[styles.changeActionText, { color: theme.primary }]}>Cambiar de Galería</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={tomarFotoCamara}
          >
            <Camera size={18} color={theme.primary} />
            <Text style={[styles.actionBtnText, { color: theme.text }]}>📷 Tomar Foto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={elegirDeGaleria}
          >
            <ImageIcon size={18} color={theme.primary} />
            <Text style={[styles.actionBtnText, { color: theme.text }]}>🖼️ De Galería</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  requiredAsterisk: {
    color: '#ef4444',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: {
    fontSize: 12,
    color: '#ef4444',
    fontFamily: fonts.medium,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    marginBottom: 2,
  },
  previewSubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginBottom: 6,
  },
  changeActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  changeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeActionText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
});
