import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { UserPlus, UserCircle, Save, X } from 'lucide-react-native';

export default function ManageUsersScreen() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRol, setFormRol] = useState<'CREADOR' | 'LOGISTICA' | 'AUXILIAR'>('AUXILIAR');
  const [formSedes, setFormSedes] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkRole();
    loadData();
  }, []);

  const checkRole = async () => {
    const rol = await AsyncStorage.getItem('usuario_rol');
    if (rol !== 'CREADOR' && rol !== 'ADMIN') {
      Alert.alert('Acceso Denegado', 'Esta pantalla es exclusiva para el Creador.');
      router.replace('/');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: s } = await supabase.from('sedes').select('*').order('id');
      if (s) setSedes(s);

      const { data: u } = await supabase
        .from('usuarios')
        .select('*, usuario_sedes(sede_id)')
        .order('id');
      
      if (u) setUsuarios(u);
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const openNewUserModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormUsername('');
    setFormPassword('');
    setFormRol('AUXILIAR');
    const initialSedes: Record<number, boolean> = {};
    sedes.forEach(s => initialSedes[s.id] = false);
    setFormSedes(initialSedes);
    setModalVisible(true);
  };

  const openEditUserModal = (user: any) => {
    setEditingUser(user);
    setFormName(user.nombre_completo);
    setFormUsername(user.username);
    setFormPassword(user.password);
    
    let rolNormalizado: 'CREADOR' | 'LOGISTICA' | 'AUXILIAR' = 'AUXILIAR';
    if (user.rol === 'CREADOR' || user.rol === 'ADMIN') rolNormalizado = 'CREADOR';
    else if (user.rol === 'LOGISTICA') rolNormalizado = 'LOGISTICA';
    else rolNormalizado = 'AUXILIAR';
    setFormRol(rolNormalizado);
    
    const initialSedes: Record<number, boolean> = {};
    sedes.forEach(s => initialSedes[s.id] = false);
    user.usuario_sedes?.forEach((us: any) => {
      initialSedes[us.sede_id] = true;
    });
    setFormSedes(initialSedes);
    setModalVisible(true);
  };

  const saveUser = async () => {
    const cleanName = formName.trim();
    const cleanUsername = formUsername.trim().toLowerCase();
    const cleanPassword = formPassword.trim();

    if (!cleanName || !cleanUsername || !cleanPassword) {
      return Alert.alert('Aviso', 'Completa todos los campos del usuario');
    }

    setSaving(true);
    try {
      let userId = editingUser?.id;

      if (editingUser) {
        // Update user
        const { error } = await supabase.from('usuarios')
          .update({ nombre_completo: cleanName, username: cleanUsername, password: cleanPassword, rol: formRol })
          .eq('id', userId);
        if (error) throw error;
      } else {
        // Create user
        const { data, error } = await supabase.from('usuarios')
          .insert([{ nombre_completo: cleanName, username: cleanUsername, password: cleanPassword, rol: formRol }])
          .select().single();
        if (error) throw error;
        userId = data.id;
      }

      // Update sedes (delete all, then insert true ones if Auxiliar)
      await supabase.from('usuario_sedes').delete().eq('usuario_id', userId);
      
      if (formRol === 'AUXILIAR') {
        const sedesToInsert = Object.keys(formSedes)
          .filter(sedeId => formSedes[Number(sedeId)])
          .map(sedeId => ({ usuario_id: userId, sede_id: Number(sedeId) }));
          
        if (sedesToInsert.length > 0) {
          const { error: sedesError } = await supabase.from('usuario_sedes').insert(sedesToInsert);
          if (sedesError) throw sedesError;
        }
      }

      Alert.alert('Éxito', 'Cuenta y accesos actualizados correctamente');
      setModalVisible(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const toggleSede = (sedeId: number) => {
    setFormSedes(prev => ({ ...prev, [sedeId]: !prev[sedeId] }));
  };

  const getRoleBadgeInfo = (rol: string) => {
    if (rol === 'CREADOR' || rol === 'ADMIN') {
      return { label: '👑 CREADOR', bg: '#fef3c7', text: '#b45309', iconColor: '#d97706' };
    }
    if (rol === 'LOGISTICA') {
      return { label: '🚚 GESTOR LOGÍSTICA', bg: '#ecfdf5', text: '#059669', iconColor: '#059669' };
    }
    return { label: '👨‍🏫 AUXILIAR / PROFESOR', bg: '#eff6ff', text: '#2563eb', iconColor: '#3b82f6' };
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0f172a" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.title}>Cuentas y Accesos</Text>
            <Text style={styles.subtitle}>Gestión de permisos en 3 niveles</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openNewUserModal} activeOpacity={0.8}>
            <UserPlus color="white" size={18} />
            <Text style={styles.addBtnText}>+ Nueva Cuenta</Text>
          </TouchableOpacity>
        </View>

        {usuarios.map(u => {
          const badge = getRoleBadgeInfo(u.rol);
          const isAuxiliar = u.rol === 'AUXILIAR' || u.rol === 'VENDEDOR';
          const isLogistica = u.rol === 'LOGISTICA';

          return (
            <TouchableOpacity key={u.id} style={styles.userCard} onPress={() => openEditUserModal(u)}>
              <View style={styles.userInfo}>
                <UserCircle color={badge.iconColor} size={42} />
                <View style={styles.userTexts}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">{u.nombre_completo}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.roleText, { color: badge.text }]}>{badge.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.userUsername}>Usuario: <Text style={{ fontWeight: 'bold' }}>@{u.username}</Text></Text>
                  <Text style={styles.userPassword}>Contraseña: <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{u.password}</Text></Text>
                  
                  {isAuxiliar ? (
                    <Text style={[styles.userSedes, { color: '#2563eb' }]}>
                      📍 Sedes asignadas: {u.usuario_sedes?.length || 0}
                    </Text>
                  ) : isLogistica ? (
                    <Text style={[styles.userSedes, { color: '#059669' }]}>
                      📦 Acceso: Almacén Matriz, Pedidos & Despachos
                    </Text>
                  ) : (
                    <Text style={[styles.userSedes, { color: '#b45309' }]}>
                      ⚡ Acceso Maestro Total (Finanzas, Personal y Precios)
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingUser ? 'Editar Cuenta y Accesos' : 'Crear Nueva Cuenta'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X color="#64748b" size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            
            <Text style={styles.label}>Nivel / Rol de Cuenta</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleOption, formRol === 'CREADOR' && styles.roleOptionActiveCreator]}
                onPress={() => setFormRol('CREADOR')}
              >
                <Text style={[styles.roleOptionEmoji]}>👑</Text>
                <Text style={[styles.roleOptionText, formRol === 'CREADOR' && styles.roleOptionTextActive]}>Creador</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleOption, formRol === 'LOGISTICA' && styles.roleOptionActiveLogistics]}
                onPress={() => setFormRol('LOGISTICA')}
              >
                <Text style={[styles.roleOptionEmoji]}>🚚</Text>
                <Text style={[styles.roleOptionText, formRol === 'LOGISTICA' && styles.roleOptionTextActive]}>Logística</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleOption, formRol === 'AUXILIAR' && styles.roleOptionActiveAuxiliar]}
                onPress={() => setFormRol('AUXILIAR')}
              >
                <Text style={[styles.roleOptionEmoji]}>👨‍🏫</Text>
                <Text style={[styles.roleOptionText, formRol === 'AUXILIAR' && styles.roleOptionTextActive]}>Auxiliar</Text>
              </TouchableOpacity>
            </View>

            {/* Explicación de permisos del rol seleccionado */}
            <View style={styles.roleExplanationBox}>
              {formRol === 'CREADOR' && (
                <Text style={styles.roleExplanationText}>
                  👑 <Text style={{ fontWeight: 'bold' }}>Creador:</Text> Acceso total al sistema, finanzas globales, precios y control absoluto para crear o revocar accesos a otras cuentas.
                </Text>
              )}
              {formRol === 'LOGISTICA' && (
                <Text style={styles.roleExplanationText}>
                  🚚 <Text style={{ fontWeight: 'bold' }}>Gestor de Logística:</Text> Acceso al Almacén Matriz, compras mayoristas, atención de pedidos de sedes y despachos. Sin acceso a cuentas ni precios.
                </Text>
              )}
              {formRol === 'AUXILIAR' && (
                <Text style={styles.roleExplanationText}>
                  👨‍🏫 <Text style={{ fontWeight: 'bold' }}>Auxiliar / Profesor:</Text> Acceso enfocado a registrar ventas (rápida/detallada), stock de su sede, resumen de ventas y solicitudes de reabastecimiento.
                </Text>
              )}
            </View>

            <Text style={styles.label}>Nombre Completo</Text>
            <TextInput style={styles.input} value={formName} onChangeText={setFormName} placeholder="Ej. Juan Pérez" />

            <Text style={styles.label}>Nombre de Usuario (Login)</Text>
            <TextInput style={styles.input} value={formUsername} onChangeText={setFormUsername} autoCapitalize="none" autoCorrect={false} placeholder="ej. juan.perez" />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput style={styles.input} value={formPassword} onChangeText={setFormPassword} autoCapitalize="none" autoCorrect={false} placeholder="******" />

            {formRol === 'AUXILIAR' ? (
              <>
                <Text style={styles.sectionTitle}>Sedes Asignadas al Auxiliar</Text>
                <Text style={styles.sectionSub}>Activa las sedes donde este auxiliar podrá registrar ventas:</Text>
                {sedes.map(sede => (
                  <View key={sede.id} style={styles.switchRow}>
                    <Text style={styles.switchLabel}>{sede.nombre}</Text>
                    <Switch 
                      value={formSedes[sede.id]} 
                      onValueChange={() => toggleSede(sede.id)}
                      trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                    />
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.globalNoticeBox}>
                <Text style={styles.globalNoticeText}>
                  ℹ️ Las cuentas de tipo <Text style={{ fontWeight: 'bold' }}>{formRol === 'CREADOR' ? 'Creador' : 'Gestor de Logística'}</Text> tienen acceso global a todas las sedes automáticamente.
                </Text>
              </View>
            )}

          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveBtn} onPress={saveUser} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Save color="white" size={20} />}
              <Text style={styles.saveBtnText}>Guardar Usuario</Text>
            </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 6, flexShrink: 0 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  
  userCard: { backgroundColor: 'white', padding: 16, borderRadius: 18, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#64748b', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  userTexts: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
  userName: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 },
  roleBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, flexShrink: 0 },
  roleText: { fontSize: 10, fontWeight: 'bold' },
  userUsername: { fontSize: 14, color: '#64748b', marginTop: 2 },
  userPassword: { fontSize: 13, color: '#475569', marginTop: 2 },
  userSedes: { fontSize: 12, fontWeight: '600', marginTop: 6 },

  roleSelector: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  roleOption: { flex: 1, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', backgroundColor: 'white' },
  roleOptionEmoji: { fontSize: 20, marginBottom: 4 },
  roleOptionActiveCreator: { backgroundColor: '#d97706', borderColor: '#d97706' },
  roleOptionActiveLogistics: { backgroundColor: '#059669', borderColor: '#059669' },
  roleOptionActiveAuxiliar: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  roleOptionText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  roleOptionTextActive: { color: 'white' },

  roleExplanationBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  roleExplanationText: { fontSize: 12, color: '#334155', lineHeight: 18 },

  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: 'white' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  modalScroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, color: '#0f172a' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginTop: 24, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  switchLabel: { fontSize: 15, fontWeight: '500', color: '#334155' },
  
  globalNoticeBox: { backgroundColor: '#eff6ff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#bfdbfe', marginTop: 18 },
  globalNoticeText: { fontSize: 13, color: '#1e40af', lineHeight: 18 },

  modalFooter: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  saveBtn: { backgroundColor: '#10b981', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 14, gap: 10 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
