import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Presentation,
  Clock,
  Users,
  Settings,
} from 'lucide-react-native';
import { CandidatoStaff } from '../data/turnosStaffData';
import PresentacionSlideDeck from '../components/entrevistas/PresentacionSlideDeck';
import AsignadorHorariosTab from '../components/entrevistas/AsignadorHorariosTab';
import CandidatosListaTab from '../components/entrevistas/CandidatosListaTab';
import ModalAjustes from '../components/ModalAjustes';
import { useAppTheme } from '../context/ThemeContext';
import { fonts } from '../theme';

const STORAGE_KEY_CANDIDATOS = '@campeones_candidatos_staff';

export default function EntrevistasScreen() {
  const { theme, isDark } = useAppTheme();
  const [modalAjustesVisible, setModalAjustesVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'PRESENTACION' | 'HORARIOS' | 'CANDIDATOS'>('PRESENTACION');
  const [candidatos, setCandidatos] = useState<CandidatoStaff[]>([]);

  useEffect(() => {
    cargarCandidatos();
  }, []);

  const cargarCandidatos = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_CANDIDATOS);
      if (data) {
        setCandidatos(JSON.parse(data));
      }
    } catch (e) {
      console.error('Error al cargar candidatos:', e);
    }
  };

  const guardarCandidato = async (nuevoCandidato: CandidatoStaff) => {
    try {
      const actualizados = [nuevoCandidato, ...candidatos];
      setCandidatos(actualizados);
      await AsyncStorage.setItem(STORAGE_KEY_CANDIDATOS, JSON.stringify(actualizados));
    } catch (e) {
      console.error('Error al guardar candidato:', e);
      throw e;
    }
  };

  const eliminarCandidato = async (id: string) => {
    try {
      const actualizados = candidatos.filter((c) => c.id !== id);
      setCandidatos(actualizados);
      await AsyncStorage.setItem(STORAGE_KEY_CANDIDATOS, JSON.stringify(actualizados));
    } catch (e) {
      console.error('Error al eliminar candidato:', e);
      Alert.alert('Error', 'No se pudo eliminar el postulante.');
    }
  };

  const limpiarTodos = async () => {
    try {
      setCandidatos([]);
      await AsyncStorage.removeItem(STORAGE_KEY_CANDIDATOS);
    } catch (e) {
      console.error('Error al limpiar candidatos:', e);
      Alert.alert('Error', 'No se pudieron limpiar los postulantes.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Barra Superior con Botón Atrás y Título */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Entrevistas & Staff</Text>
            <Text style={styles.headerSub}>Club Campeones Lima</Text>
          </View>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setModalAjustesVisible(true)}
            activeOpacity={0.7}
          >
            <Settings size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Pestañas de Navegación Fijas Superiores */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'PRESENTACION' && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab('PRESENTACION')}
            activeOpacity={0.8}
          >
            <Presentation
              size={15}
              color={activeTab === 'PRESENTACION' ? '#0d1b2a' : '#94a3b8'}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'PRESENTACION' && styles.tabBtnTextActive,
              ]}
            >
              Pitch
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'HORARIOS' && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab('HORARIOS')}
            activeOpacity={0.8}
          >
            <Clock
              size={15}
              color={activeTab === 'HORARIOS' ? '#0d1b2a' : '#94a3b8'}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'HORARIOS' && styles.tabBtnTextActive,
              ]}
            >
              Horarios
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'CANDIDATOS' && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab('CANDIDATOS')}
            activeOpacity={0.8}
          >
            <Users
              size={15}
              color={activeTab === 'CANDIDATOS' ? '#0d1b2a' : '#94a3b8'}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'CANDIDATOS' && styles.tabBtnTextActive,
              ]}
            >
              Postulantes ({candidatos.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenido según la Pestaña Activa */}
        <View style={styles.tabContentArea}>
          {activeTab === 'PRESENTACION' && (
            <PresentacionSlideDeck
              onIrAHorarios={() => setActiveTab('HORARIOS')}
            />
          )}

          {activeTab === 'HORARIOS' && (
            <AsignadorHorariosTab
              onGuardarCandidato={guardarCandidato}
              onIrACandidatos={() => setActiveTab('CANDIDATOS')}
            />
          )}

          {activeTab === 'CANDIDATOS' && (
            <CandidatosListaTab
              candidatos={candidatos}
              onEliminarCandidato={eliminarCandidato}
              onLimpiarTodos={limpiarTodos}
              onIrAHorarios={() => setActiveTab('HORARIOS')}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Modal de Ajustes & Selector de Tema */}
      <ModalAjustes
        visible={modalAjustesVisible}
        onClose={() => setModalAjustesVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070f18',
  },
  keyboardContainer: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#070f18',
    borderBottomWidth: 1,
    borderBottomColor: '#1b263b',
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1b263b',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  headerSub: {
    color: '#f59e0b',
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  placeholderRight: {
    width: 38,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0d1b2a',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1b263b',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1b263b',
  },
  tabBtnActive: {
    backgroundColor: '#f59e0b',
  },
  tabBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  tabBtnTextActive: {
    color: '#0d1b2a',
    fontFamily: fonts.bold,
  },
  tabContentArea: {
    flex: 1,
    backgroundColor: '#0d1b2a',
  },
});
