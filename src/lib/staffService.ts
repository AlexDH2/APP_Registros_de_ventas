import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TurnoStaff,
  CandidatoStaff,
  TURNOS_OFICIALES,
} from '../data/turnosStaffData';

const STORAGE_KEY_TURNOS = '@campeones_turnos_staff_cache';
const STORAGE_KEY_CANDIDATOS = '@campeones_candidatos_staff';

/**
 * Obtener todos los turnos oficiales de entrenamiento.
 * Primero consulta Supabase en tiempo real. Si no hay conexión o la tabla aún no se ha creado,
 * utiliza los turnos oficiales locales (TURNOS_OFICIALES) como respaldo de alta disponibilidad.
 */
export async function fetchTurnosStaff(): Promise<TurnoStaff[]> {
  try {
    const { data, error } = await supabase
      .from('turnos_staff')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (!error && data && data.length > 0) {
      const turnosMapeados: TurnoStaff[] = data.map((t: any) => ({
        id: t.id,
        sede: t.sede,
        espacio: t.espacio,
        frecuencia: t.frecuencia,
        dias: Array.isArray(t.dias) ? t.dias : JSON.parse(t.dias || '[]'),
        diasTexto: t.dias_texto,
        horario: t.horario,
        horaInicio: Number(t.hora_inicio),
        horaFin: Number(t.hora_fin),
        horasPorDia: Number(t.horas_por_dia),
        diasPorSemana: Number(t.dias_por_semana),
        horasSemanales: Number(t.horas_semanales),
      }));

      // Guardar en caché local
      await AsyncStorage.setItem(STORAGE_KEY_TURNOS, JSON.stringify(turnosMapeados));
      return turnosMapeados;
    }
  } catch (e) {
    console.warn('No se pudo conectar a turnos_staff en Supabase, usando respaldo local:', e);
  }

  // Respaldo 1: Caché local previa
  try {
    const cache = await AsyncStorage.getItem(STORAGE_KEY_TURNOS);
    if (cache) {
      const parsed = JSON.parse(cache);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Error al leer caché local de turnos:', err);
  }

  // Respaldo 2: Lista oficial definida en código
  return TURNOS_OFICIALES;
}

/**
 * Obtener las fichas de todos los candidatos registrados en Supabase.
 */
export async function fetchCandidatosStaff(): Promise<CandidatoStaff[]> {
  try {
    const { data, error } = await supabase
      .from('candidatos_staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const candidatosMapeados: CandidatoStaff[] = data.map((c: any) => ({
        id: c.id,
        fecha: c.fecha,
        nombre: c.nombre,
        telefono: c.telefono || '',
        distrito: c.distrito || '',
        edad: c.edad || '18',
        calificacion: Number(c.calificacion || 5),
        notas: c.notas || '',
        turnos: Array.isArray(c.turnos) ? c.turnos : JSON.parse(c.turnos || '[]'),
        totalHoras: Number(c.total_horas || 0),
        totalTurnos: Number(c.total_turnos || 0),
      }));

      await AsyncStorage.setItem(STORAGE_KEY_CANDIDATOS, JSON.stringify(candidatosMapeados));
      return candidatosMapeados;
    }
  } catch (e) {
    console.warn('Error al obtener candidatos de Supabase, usando almacenamiento local:', e);
  }

  // Respaldo local si no hay red o si la tabla aún no se ha creado
  try {
    const local = await AsyncStorage.getItem(STORAGE_KEY_CANDIDATOS);
    if (local) {
      return JSON.parse(local);
    }
  } catch (err) {
    console.warn('Error al leer candidatos locales:', err);
  }

  return [];
}

/**
 * Guardar o actualizar la ficha de un candidato tanto en Supabase como en AsyncStorage.
 */
export async function guardarCandidatoStaff(
  candidato: CandidatoStaff,
  entrevistadorNombre?: string
): Promise<void> {
  // 1. Guardar en Supabase
  try {
    const { error } = await supabase.from('candidatos_staff').upsert({
      id: candidato.id,
      fecha: candidato.fecha,
      nombre: candidato.nombre,
      telefono: candidato.telefono,
      distrito: candidato.distrito,
      edad: candidato.edad,
      calificacion: candidato.calificacion,
      notas: candidato.notas,
      total_horas: candidato.totalHoras,
      total_turnos: candidato.totalTurnos,
      turnos: candidato.turnos,
      entrevistador_nombre: entrevistadorNombre || 'Entrevistador',
    });

    if (error) {
      console.warn('Aviso Supabase al guardar candidato (se guarda localmente):', error.message);
    }
  } catch (e) {
    console.warn('No se pudo guardar en Supabase (guardando en local):', e);
  }

  // 2. Guardar en almacenamiento local
  try {
    const local = await AsyncStorage.getItem(STORAGE_KEY_CANDIDATOS);
    let list: CandidatoStaff[] = local ? JSON.parse(local) : [];
    list = [candidato, ...list.filter((c) => c.id !== candidato.id)];
    await AsyncStorage.setItem(STORAGE_KEY_CANDIDATOS, JSON.stringify(list));
  } catch (e) {
    console.error('Error al guardar candidato localmente:', e);
  }
}

/**
 * Eliminar la ficha de un candidato en Supabase y localmente.
 */
export async function eliminarCandidatoStaff(id: string): Promise<void> {
  // 1. Eliminar en Supabase
  try {
    const { error } = await supabase.from('candidatos_staff').delete().eq('id', id);
    if (error) {
      console.warn('Aviso Supabase al eliminar candidato:', error.message);
    }
  } catch (e) {
    console.warn('Error al eliminar en Supabase:', e);
  }

  // 2. Eliminar localmente
  try {
    const local = await AsyncStorage.getItem(STORAGE_KEY_CANDIDATOS);
    if (local) {
      const list: CandidatoStaff[] = JSON.parse(local);
      const filtrado = list.filter((c) => c.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY_CANDIDATOS, JSON.stringify(filtrado));
    }
  } catch (e) {
    console.error('Error al eliminar localmente:', e);
  }
}
