import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Lock, Store, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const savedUserId = await AsyncStorage.getItem('usuario_id');
      const savedRol = await AsyncStorage.getItem('usuario_rol');
      const savedSedeId = await AsyncStorage.getItem('sede_id');
      
      if (savedUserId && savedRol) {
        if (savedRol === 'CREADOR' || savedRol === 'ADMIN') {
          router.replace('/admin/dashboard' as any);
        } else if (savedRol === 'LOGISTICA') {
          router.replace('/logistica_dashboard' as any);
        } else if (savedSedeId) {
          router.replace('/home');
        } else {
          router.replace('/seller_sedes' as any);
        }
      }
    } catch (e) {
      // Ignorar
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      return Alert.alert('Aviso', 'Ingresa tu usuario y contraseña');
    }

    setLoggingIn(true);
    try {
      // 1. Validar usuario (insensible a mayúsculas/minúsculas)
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (error) {
        setLoggingIn(false);
        return Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor. Revisa tu conexión a internet.');
      }

      if (!usuario) {
        setLoggingIn(false);
        return Alert.alert(
          'Usuario No Encontrado',
          `No existe ninguna cuenta registrada con el usuario "${cleanUsername}".\n\nVerifica la ortografía o consulta al Administrador.`
        );
      }

      // 2. Validar contraseña (acepta exacta, con trim o insensible a mayúsculas por compatibilidad móvil)
      const matchExact = usuario.password === password;
      const matchTrim = usuario.password === cleanPassword;
      const matchLower = usuario.password.toLowerCase() === cleanPassword.toLowerCase();

      if (!matchExact && !matchTrim && !matchLower) {
        setLoggingIn(false);
        return Alert.alert(
          'Contraseña Incorrecta',
          `La contraseña no es correcta para el usuario @${usuario.username}.\n\nSi no recuerdas la contraseña de @${usuario.username}, el Administrador puede verla o cambiarla desde el panel "Cuentas y Accesos".`
        );
      }

      // 3. Guardar sesión
      await AsyncStorage.setItem('usuario_id', usuario.id.toString());
      await AsyncStorage.setItem('usuario_nombre', usuario.nombre_completo);
      await AsyncStorage.setItem('usuario_rol', usuario.rol);

      // Limpiar sede actual por si había previa
      await AsyncStorage.removeItem('sede_id');
      await AsyncStorage.removeItem('sede_nombre');

      if (usuario.rol === 'CREADOR' || usuario.rol === 'ADMIN') {
        router.replace('/admin/dashboard' as any);
      } else if (usuario.rol === 'LOGISTICA') {
        router.replace('/logistica_dashboard' as any);
      } else {
        router.replace('/seller_sedes' as any);
      }

    } catch {
      Alert.alert('Error', 'Hubo un problema al iniciar sesión');
    } finally {
      setLoggingIn(false);
    }
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
      <View style={styles.content}>
        
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Store color="#2563eb" size={48} />
          </View>
          <Text style={styles.title}>Sistema POS</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <User color="#94a3b8" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Usuario (ej. juan.perez)"
              placeholderTextColor="#94a3b8"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Lock color="#94a3b8" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              {showPassword ? (
                <EyeOff color="#64748b" size={20} />
              ) : (
                <Eye color="#64748b" size={20} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.loginBtn, loggingIn && styles.loginBtnDisabled]} 
            onPress={handleLogin}
            disabled={loggingIn}
          >
            {loggingIn ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginBtnText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, justifyContent: 'center', padding: 25 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconContainer: { backgroundColor: '#eff6ff', padding: 20, borderRadius: 24, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#64748b' },
  form: { backgroundColor: 'white', padding: 25, borderRadius: 24, shadowColor: '#64748b', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 55, fontSize: 16, color: '#0f172a' },
  eyeBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  loginBtn: { backgroundColor: '#2563eb', height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  loginBtnDisabled: { backgroundColor: '#93c5fd' },
  loginBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
