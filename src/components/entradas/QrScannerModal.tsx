import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import jsQR from 'jsqr';
import { X, Flashlight, FlashlightOff, QrCode, Camera } from 'lucide-react-native';
import { fonts } from '../../theme';

interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (codigo: string) => void;
}

/**
 * Escáner QR para navegadores Web (Android Chrome, iOS Safari, Desktop) usando getUserMedia + jsQR.
 */
function WebQrScanner({
  onScan,
  onClose,
}: {
  onScan: (codigo: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const scannedRef = useRef<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    scannedRef.current = false;

    const iniciarCamara = async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          setErrorMsg('Tu navegador no permite acceso a la cámara. Usa HTTPS o escribe el ID manualmente.');
          setIniciando(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t: any) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          await video.play();
        }
        setIniciando(false);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const escanearFrame = () => {
          if (!active || scannedRef.current) return;
          const v = videoRef.current;
          if (v && v.readyState === v.HAVE_ENOUGH_DATA && ctx) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data && code.data.trim()) {
              scannedRef.current = true;
              detenerCamara();
              onScan(code.data.trim());
              return;
            }
          }
          rafRef.current = requestAnimationFrame(escanearFrame);
        };

        rafRef.current = requestAnimationFrame(escanearFrame);
      } catch (err: any) {
        if (active) {
          setErrorMsg(
            err?.name === 'NotAllowedError'
              ? 'Permiso de cámara denegado. Habilita la cámara en tu navegador para escanear.'
              : 'No se pudo acceder a la cámara del dispositivo.'
          );
          setIniciando(false);
        }
      }
    };

    const detenerCamara = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t: any) => t.stop());
        streamRef.current = null;
      }
    };

    iniciarCamara();

    return () => {
      active = false;
      detenerCamara();
    };
  }, [onScan]);

  return (
    <View style={styles.webCameraContainer}>
      {errorMsg ? (
        <View style={styles.permissionBox}>
          <Camera size={40} color="#ef4444" />
          <Text style={styles.permissionTitle}>Cámara no disponible</Text>
          <Text style={styles.permissionSub}>{errorMsg}</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={onClose}>
            <Text style={styles.permissionBtnText}>Volver y escribir ID</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cameraWrapper}>
          {React.createElement('video', {
            ref: videoRef,
            muted: true,
            playsInline: true,
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          })}

          {iniciando && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#38bdf8" />
              <Text style={styles.loadingText}>Iniciando cámara...</Text>
            </View>
          )}

          {/* Marco guía de escaneo */}
          <View style={styles.reticleOverlay} pointerEvents="none">
            <View style={styles.reticleBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.hintPill}>Apunta al código QR del comprador</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Escáner QR Nativo (Android / iOS) usando expo-camera CameraView.
 */
function NativeQrScanner({
  onScan,
  onClose,
}: {
  onScan: (codigo: string) => void;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [linterna, setLinterna] = useState<boolean>(false);
  const scannedRef = useRef<boolean>(false);

  useEffect(() => {
    scannedRef.current = false;
  }, []);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scannedRef.current) return;
    const raw = (result?.data || '').trim();
    if (!raw) return;

    scannedRef.current = true;
    onScan(raw);
  };

  if (!permission) {
    return (
      <View style={styles.permissionBox}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.permissionSub}>Verificando permisos de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionBox}>
        <Camera size={44} color="#38bdf8" />
        <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
        <Text style={styles.permissionSub}>
          Necesitamos acceso a tu cámara para escanear el código QR del padre en la puerta.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Permitir Cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
          <Text style={styles.cancelLinkText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraWrapper}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={linterna}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Marco guía y controles */}
      <View style={styles.reticleOverlay} pointerEvents="box-none">
        <View style={styles.reticleBox}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <Text style={styles.hintPill}>Apunta al código QR del comprador</Text>

        <TouchableOpacity
          style={[styles.torchBtn, linterna && styles.torchBtnActive]}
          onPress={() => setLinterna((prev) => !prev)}
        >
          {linterna ? (
            <FlashlightOff size={18} color="#0f172a" />
          ) : (
            <Flashlight size={18} color="#ffffff" />
          )}
          <Text style={[styles.torchBtnText, linterna && { color: '#0f172a' }]}>
            {linterna ? 'Apagar Linterna' : 'Encender Linterna'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function QrScannerModal({
  visible,
  onClose,
  onScan,
}: QrScannerModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* Barra superior */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <QrCode size={20} color="#38bdf8" />
            <Text style={styles.headerTitle}>Escanear QR de Pre-Registro</Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Visor de cámara según plataforma */}
        {Platform.OS === 'web' ? (
          <WebQrScanner onScan={onScan} onClose={onClose} />
        ) : (
          <NativeQrScanner onScan={onScan} onClose={onClose} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 14,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webCameraContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  reticleOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  reticleBox: {
    width: 240,
    height: 240,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: '#38bdf8',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  hintPill: {
    marginTop: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    color: '#f8fafc',
    fontSize: 13,
    fontFamily: fonts.semiBold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    textAlign: 'center',
  },
  torchBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  torchBtnActive: {
    backgroundColor: '#facc15',
    borderColor: '#eab308',
  },
  torchBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    gap: 12,
  },
  permissionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  permissionSub: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  cancelLink: {
    paddingVertical: 10,
  },
  cancelLinkText: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: fonts.medium,
  },
});
