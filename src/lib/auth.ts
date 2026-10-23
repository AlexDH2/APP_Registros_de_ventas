import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { getOfflineSales } from './offlineSync';

export const SESSION_KEYS = [
  'usuario_id',
  'usuario_nombre',
  'usuario_rol',
  'sede_id',
  'sede_nombre',
  'caja_id',
];

/**
 * Muestra una alerta de confirmación antes de cerrar sesión.
 * Si hay ventas locales pendientes de sincronización (modo offline),
 * advierte al usuario para prevenir pérdida de información antes de salir.
 * Limpia únicamente las variables de sesión del usuario para no corromper la cola offline.
 */
export const confirmAndLogout = async (customMessage?: string) => {
  let pendingSalesCount = 0;
  try {
    const pendingSales = await getOfflineSales();
    pendingSalesCount = pendingSales ? pendingSales.length : 0;
  } catch {
    pendingSalesCount = 0;
  }

  const alertMessage =
    pendingSalesCount > 0
      ? `⚠️ ATENCIÓN: Tienes ${pendingSalesCount} venta(s) guardadas sin conexión pendientes de sincronizar.\n\n¿Estás seguro de que deseas salir?`
      : customMessage || '¿Estás seguro de que deseas salir de tu cuenta?';

  Alert.alert('Cerrar Sesión', alertMessage, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Cerrar Sesión',
      style: 'destructive',
      onPress: async () => {
        try {
          await AsyncStorage.multiRemove(SESSION_KEYS);
        } catch {
          await AsyncStorage.clear();
        }
        router.replace('/');
      },
    },
  ]);
};
