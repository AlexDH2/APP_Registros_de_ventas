import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  X,
  Sun,
  Moon,
  Smartphone,
  Check,
  User,
  ShieldCheck,
  LogOut,
  Sparkles,
  Settings,
} from 'lucide-react-native';
import { useAppTheme, ThemeMode } from '../context/ThemeContext';
import { fonts } from '../theme';
import { confirmAndLogout } from '../lib/auth';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ModalAjustes({ visible, onClose }: Props) {
  const { theme, isDark, themeMode, setThemeMode } = useAppTheme();
  const [userName, setUserName] = useState<string>('');
  const [userRol, setUserRol] = useState<string>('');

  useEffect(() => {
    if (visible) {
      cargarInfoUsuario();
    }
  }, [visible]);

  const cargarInfoUsuario = async () => {
    try {
      const nombre = await AsyncStorage.getItem('usuario_nombre');
      const rol = await AsyncStorage.getItem('usuario_rol');
      if (nombre) setUserName(nombre);
      if (rol) setUserRol(rol);
    } catch (e) {
      console.warn('Error al cargar datos de usuario:', e);
    }
  };

  const opcionesTema: { mode: ThemeMode; label: string; desc: string; icon: any }[] = [
    {
      mode: 'light',
      label: 'Modo Claro',
      desc: 'Fondo blanco limpio, ideal para exteriores y luz de día.',
      icon: Sun,
    },
    {
      mode: 'dark',
      label: 'Modo Oscuro',
      desc: 'Azul marino deportivo (#0d1b2a), descansa la vista.',
      icon: Moon,
    },
    {
      mode: 'system',
      label: 'Automático (Sistema)',
      desc: 'Se adapta a la configuración de tu teléfono o navegador.',
      icon: Smartphone,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header del Modal */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
                <Settings size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Ajustes del Sistema</Text>
                <Text style={[styles.modalSub, { color: theme.textMuted }]}>
                  Club Campeones Lima
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* SECCIÓN 1: TEMA Y APARIENCIA */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Sparkles size={16} color={theme.accent} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Apariencia Visual
                </Text>
              </View>
              <Text style={[styles.sectionHelp, { color: theme.textMuted }]}>
                Personaliza los colores de la aplicación según tu preferencia:
              </Text>

              <View style={styles.themeOptionsGrid}>
                {opcionesTema.map((op) => {
                  const Icon = op.icon;
                  const isSelected = themeMode === op.mode;
                  return (
                    <TouchableOpacity
                      key={op.mode}
                      style={[
                        styles.themeOptionCard,
                        {
                          backgroundColor: theme.surface,
                          borderColor: isSelected ? theme.accent : theme.border,
                        },
                        isSelected && {
                          borderWidth: 2,
                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb',
                        },
                      ]}
                      onPress={() => setThemeMode(op.mode)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.optionHeader}>
                        <View
                          style={[
                            styles.optionIconCircle,
                            {
                              backgroundColor: isSelected ? theme.accent : isDark ? '#1b263b' : '#e2e8f0',
                            },
                          ]}
                        >
                          <Icon size={18} color={isSelected ? '#0d1b2a' : theme.text} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text
                            style={[
                              styles.optionLabel,
                              { color: theme.text },
                              isSelected && { color: theme.accent, fontFamily: fonts.bold },
                            ]}
                          >
                            {op.label}
                          </Text>
                          <Text style={[styles.optionDesc, { color: theme.textMuted }]}>
                            {op.desc}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={[styles.checkCircle, { backgroundColor: theme.accent }]}>
                            <Check size={14} color="#0d1b2a" strokeWidth={3} />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* SECCIÓN 2: PERFIL DE SESIÓN */}
            {userName ? (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <User size={16} color={theme.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Sesión Actual
                  </Text>
                </View>
                <View style={[styles.userCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.userInfoRow}>
                    <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
                      <Text style={styles.avatarText}>
                        {userName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userName, { color: theme.text }]}>{userName}</Text>
                      <View style={styles.roleBadgeBox}>
                        <ShieldCheck size={13} color={theme.primary} />
                        <Text style={[styles.userRole, { color: theme.primary }]}>
                          Rol: {userRol || 'Colaborador'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {/* SECCIÓN 3: ACCIONES RÁPIDAS */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.btnLogout, { backgroundColor: theme.dangerLight || '#fef2f2' }]}
                onPress={() => {
                  onClose();
                  confirmAndLogout();
                }}
                activeOpacity={0.8}
              >
                <LogOut size={16} color={theme.danger} />
                <Text style={[styles.btnLogoutText, { color: theme.danger }]}>
                  Cerrar Sesión
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer del Modal */}
          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.btnListo, { backgroundColor: theme.primary }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.btnListoText}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  modalSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  sectionHelp: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginBottom: 12,
    lineHeight: 18,
  },
  themeOptionsGrid: {
    gap: 10,
  },
  themeOptionCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  optionDesc: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
    lineHeight: 15,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  userName: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  roleBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnLogoutText: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  btnListo: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnListoText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.bold,
  },
});
