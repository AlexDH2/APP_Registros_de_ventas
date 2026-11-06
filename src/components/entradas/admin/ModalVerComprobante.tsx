import React from 'react';
import { View, StyleSheet, Modal, Image, TouchableOpacity, Text } from 'react-native';
import { X } from 'lucide-react-native';
import { fonts } from '../../../theme';

interface ModalVerComprobanteProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export default function ModalVerComprobante({
  visible,
  imageUrl,
  onClose,
}: ModalVerComprobanteProps) {
  if (!imageUrl) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.contentContainer}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
          <Text style={styles.tipText}>Toca la X o fuera para cerrar</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  contentContainer: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 12,
  },
});
