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
  FileText,
  Presentation,
  Clock,
  Users,
  Settings,
  Lock,
  CheckCircle,
} from 'lucide-react-native';
import { CandidatoStaff } from '../data/turnosStaffData';
import {
  fetchCandidatosStaff,
  guardarCandidatoStaff,
  eliminarCandidatoStaff,
} from '../lib/staffService';
import FichaPostulanteInicial, { DatosFichaPostulante } from '../components/entrevistas/FichaPostulanteInicial';
import PresentacionSlideDeck from '../components/entrevistas/PresentacionSlideDeck';
import AsignadorHorariosTab from '../components/entrevistas/AsignadorHorariosTab';
import CandidatosListaTab from '../components/entrevistas/CandidatosListaTab';
import ModalAjustes from '../components/ModalAjustes';
import { useAppTheme } from '../context/ThemeContext';
import { fonts } from '../theme';

type TabEntrevistas = 'FICHA' | 'PRESENTACION' | 'HORARIOS' | 'CANDIDATOS';

const FICHA_VACIA: DatosFichaPostulante = {
  nombre: '',
  telefono: '',
  distrito: '',
  edad: '',
  notas: '',
  calificacion: 5,
};

export default function EntrevistasScreen() {
  const { theme, isDark } = useAppTheme();
  const [modalAjustesVisible, setModalAjustesVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabEntrevistas>('FICHA');
  const [candidatos, setCandidatos] = useState<CandidatoStaff[]>([]);

  // Ficha Inicial Obligatoria del Postulante
  const [fichaActiva, setFichaActiva] = useState<DatosFichaPostulante>(FICHA_VACIA);
  const [fichaCompletada, setFichaCompletada] = useState<boolean>(false);

  useEffect(() => {
    cargarCandidatos();
  }, []);

  const cargarCandidatos = async () => {
    try {
      const data = await fetchCandidatosStaff();
      setCandidatos(data);
    } catch (e) {
      console.error('Error al cargar candidatos:', e);
    }
  };

  const handleValidarFicha = (datos: DatosFichaPostulante) => {
    setFichaActiva(datos);
    setFichaCompletada(true);
    setActiveTab('PRESENTACION');
  };

  const handleIntentarCambiarTab = (targetTab: TabEntrevistas) => {
    if (targetTab === 'FICHA' || targetTab === 'CANDIDATOS') {
      setActiveTab(targetTab);
      return;
    }

    if (!fichaCompletada) {
      Alert.alert(
        'Ficha de Postulante Obligatoria',
        'Antes de exponer el Pitch o asignar horarios, es obligatorio llenar y validar la Ficha de Postulante con los datos mínimos del candidato.',
        [{ text: 'Entendido', onPress: () => setActiveTab('FICHA') }]
      );
      return;
    }

    setActiveTab(targetTab);
  };

  const guardarCandidato = async (nuevoCandidato: CandidatoStaff) => {
    try {
      const uNombre = (await AsyncStorage.getItem('usuario_nombre')) || 'Entrevistador';
      await guardarCandidatoStaff(nuevoCandidato, uNombre);
      setCandidatos((prev) => [
        nuevoCandidato,
        ...prev.filter((c) => c.id !== nuevoCandidato.id),
      ]);

      // Reiniciar ficha para el siguiente postulante
      setFichaActiva(FICHA_VACIA);
      setFichaCompletada(false);
    } catch (e) {
      console.error('Error al guardar candidato:', e);
      throw e;
    }
  };

  const eliminarCandidato = async (id: string) => {
    try {
      await eliminarCandidatoStaff(id);
      setCandidatos((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('Error al eliminar candidato:', e);
      Alert.alert('Error', 'No se pudo eliminar el postulante.');
    }
  };

  const limpiarTodos = async () => {
    try {
      for (const c of candidatos) {
        await eliminarCandidatoStaff(c.id);
      }
      setCandidatos([]);
    } catch (e) {
      console.error('Error al limpiar candidatos:', e);
      Alert.alert('Error', 'No se pudieron limpiar los postulantes.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Barra Superior */}
        <View style={[styles.headerBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.surface }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Entrevistas & Staff</Text>
            <Text style={styles.headerSub}>Club Campeones Lima</Text>
          </View>

          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.surface }]}
            onPress={() => setModalAjustesVisible(true)}
            activeOpacity={0.7}
          >
            <Settings size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Pestañas de Navegación Fijas Superiores (4 Pasos Obligatorios) */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          {/* Paso 1: Ficha */}
          <TouchableOpacity
            style={[
              styles.tabBtn,
              { backgroundColor: theme.surface },
              activeTab === 'FICHA' && styles.tabBtnActive,
            ]}
            onPress={() => handleIntentarCambiarTab('FICHA')}
            activeOpacity={0.8}
          >
            {fichaCompletada ? (
              <CheckCircle size={14} color={activeTab === 'FICHA' ? '#0d1b2a' : '#10b981'} />
            ) : (
              <FileText
                size={14}
                color={activeTab === 'FICHA' ? '#0d1b2a' : theme.textMuted}
              />
            )}
            <Text
              style={[
                styles.tabBtnText,
                { color: theme.textMuted },
                activeTab === 'FICHA' && styles.tabBtnTextActive,
              ]}
              numberOfLines={1}
            >
              1. Ficha
            </Text>
          </TouchableOpacity>

          {/* Paso 2: Pitch */}
          <TouchableOpacity
            style={[
              styles.tabBtn,
              { backgroundColor: theme.surface },
              activeTab === 'PRESENTACION' && styles.tabBtnActive,
              !fichaCompletada && styles.tabBtnDisabled,
            ]}
            onPress={() => handleIntentarCambiarTab('PRESENTACION')}
            activeOpacity={0.8}
          >
            {!fichaCompletada ? (
              <Lock size={12} color="#64748b" />
            ) : (
              <Presentation
                size={14}
                color={activeTab === 'PRESENTACION' ? '#0d1b2a' : theme.textMuted}
              />
            )}
            <Text
              style={[
                styles.tabBtnText,
                { color: theme.textMuted },
                activeTab === 'PRESENTACION' && styles.tabBtnTextActive,
                !fichaCompletada && { color: '#64748b' },
              ]}
              numberOfLines={1}
            >
              2. Pitch
            </Text>
          </TouchableOpacity>

          {/* Paso 3: Horarios */}
          <TouchableOpacity
            style={[
              styles.tabBtn,
              { backgroundColor: theme.surface },
              activeTab === 'HORARIOS' && styles.tabBtnActive,
              !fichaCompletada && styles.tabBtnDisabled,
            ]}
            onPress={() => handleIntentarCambiarTab('HORARIOS')}
            activeOpacity={0.8}
          >
            {!fichaCompletada ? (
              <Lock size={12} color="#64748b" />
            ) : (
              <Clock
                size={14}
                color={activeTab === 'HORARIOS' ? '#0d1b2a' : theme.textMuted}
              />
            )}
            <Text
              style={[
                styles.tabBtnText,
                { color: theme.textMuted },
                activeTab === 'HORARIOS' && styles.tabBtnTextActive,
                !fichaCompletada && { color: '#64748b' },
              ]}
              numberOfLines={1}
            >
              3. Horarios
            </Text>
          </TouchableOpacity>

          {/* Paso 4: Postulantes */}
          <TouchableOpacity
            style={[
              styles.tabBtn,
              { backgroundColor: theme.surface },
              activeTab === 'CANDIDATOS' && styles.tabBtnActive,
            ]}
            onPress={() => handleIntentarCambiarTab('CANDIDATOS')}
            activeOpacity={0.8}
          >
            <Users
              size={14}
              color={activeTab === 'CANDIDATOS' ? '#0d1b2a' : theme.textMuted}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: theme.textMuted },
                activeTab === 'CANDIDATOS' && styles.tabBtnTextActive,
              ]}
              numberOfLines={1}
            >
              Staff ({candidatos.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenido según la Pestaña Activa */}
        <View style={[styles.tabContentArea, { backgroundColor: theme.background }]}>
          {activeTab === 'FICHA' && (
            <FichaPostulanteInicial
              datosIniciales={fichaActiva}
              onContinuarAlPitch={handleValidarFicha}
              enEdicion={fichaCompletada}
            />
          )}

          {activeTab === 'PRESENTACION' && (
            <PresentacionSlideDeck
              onIrAHorarios={() => setActiveTab('HORARIOS')}
            />
          )}

          {activeTab === 'HORARIOS' && (
            <AsignadorHorariosTab
              fichaActiva={fichaActiva}
              onGuardarCandidato={guardarCandidato}
              onIrACandidatos={() => setActiveTab('CANDIDATOS')}
              onVolverAFicha={() => setActiveTab('FICHA')}
            />
          )}

          {activeTab === 'CANDIDATOS' && (
            <CandidatosListaTab
              candidatos={candidatos}
              onEliminarCandidato={eliminarCandidato}
              onLimpiarTodos={limpiarTodos}
              onIrAHorarios={() => {
                if (fichaCompletada) {
                  setActiveTab('HORARIOS');
                } else {
                  setActiveTab('FICHA');
                }
              }}
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#0d1b2a',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1b263b',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#1b263b',
  },
  tabBtnActive: {
    backgroundColor: '#f59e0b',
  },
  tabBtnDisabled: {
    opacity: 0.6,
  },
  tabBtnText: {
    color: '#94a3b8',
    fontSize: 11,
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
