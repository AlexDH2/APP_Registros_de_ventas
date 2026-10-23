import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapPin, ChevronRight, LogOut, User } from 'lucide-react-native';
import { confirmAndLogout } from '../lib/auth';

type Sede = {
  id: number;
  nombre: string;
};

export default function SellerSedesScreen() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    loadSedes();
  }, []);

  const loadSedes = async () => {
    setLoading(true);
    try {
      const usuarioId = await AsyncStorage.getItem('usuario_id');
      const nombreUsuario = await AsyncStorage.getItem('usuario_nombre');
      if (nombreUsuario) setNombre(nombreUsuario);

      if (!usuarioId) {
        router.replace('/');
        return;
      }

      // Obtener sedes asignadas al usuario
      const { data, error } = await supabase
        .from('usuario_sedes')
        .select('sedes (id, nombre)')
        .eq('usuario_id', usuarioId);

      if (error) throw error;

      const sedesAsignadas = (data || []).map((item: any) => item.sedes).filter(Boolean);
      
      if (sedesAsignadas.length === 1 && sedesAsignadas[0]?.id) {
        // Bypass si solo tiene una sede
        await AsyncStorage.setItem('sede_id', sedesAsignadas[0].id.toString());
        await AsyncStorage.setItem('sede_nombre', sedesAsignadas[0].nombre);
        router.replace('/home');
        return;
      }

      setSedes(sedesAsignadas);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar tus sedes asignadas.');
    } finally {
      setLoading(false);
    }
  };

  const selectSede = async (sede: Sede) => {
    await AsyncStorage.setItem('sede_id', sede.id.toString());
    await AsyncStorage.setItem('sede_nombre', sede.nombre);
    router.replace('/home');
  };

  const logout = () => {
    confirmAndLogout();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileBadge}>
          <User color="#2563eb" size={20} />
          <Text style={styles.profileName}>{nombre} • Auxiliar / Profesor</Text>
        </View>
        <Text style={styles.title}>Mis Sedes</Text>
        <Text style={styles.subtitle}>Selecciona la sede donde trabajarás hoy</Text>
      </View>

      <FlatList
        data={sedes}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => selectSede(item)}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <View style={styles.avatar}>
                <MapPin color="#2563eb" size={24} />
              </View>
              <Text style={styles.cardText}>{item.nombre}</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={24} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes ninguna sede asignada.</Text>
            <Text style={styles.emptySubtext}>Contacta con el administrador.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={logout}
        activeOpacity={0.7}
      >
        <LogOut color="#ef4444" size={20} />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 30, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  profileBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginBottom: 20 },
  profileName: { color: '#2563eb', fontWeight: '700', marginLeft: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 5 },
  subtitle: { fontSize: 15, color: '#64748b' },
  listContainer: { padding: 20 },
  card: { backgroundColor: '#ffffff', padding: 20, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: { backgroundColor: '#eff6ff', padding: 10, borderRadius: 12, marginRight: 15 },
  cardText: { fontSize: 17, fontWeight: '600', color: '#334155' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: '#475569', fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 5 },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: 'white',
  },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16, marginLeft: 10 }
});
