import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MaterialSede {
  id: number;
  sede_nombre: string;
  material_nombre: string;
  categoria: string;
  marzo: number;
  abril: number;
  mayo: number;
  junio: number;
  julio: number;
  agosto: number;
  septiembre: number;
  octubre: number;
  noviembre: number;
  diciembre: number;
  notas?: string | null;
  updated_at?: string;
}

export interface IndumentariaSede {
  id: number;
  sede_nombre: string;
  talla_10: number;
  talla_12: number;
  talla_14: number;
  talla_16: number;
  talla_s: number;
  talla_m: number;
  talla_l: number;
  talla_xl: number;
  talla_xxl: number;
  notas?: string | null;
  updated_at?: string;
  total?: number;
}

export const MESES_OFICIALES = [
  { key: 'marzo', label: 'Marzo' },
  { key: 'abril', label: 'Abril' },
  { key: 'mayo', label: 'Mayo' },
  { key: 'junio', label: 'Junio' },
  { key: 'julio', label: 'Julio' },
  { key: 'agosto', label: 'Agosto' },
  { key: 'septiembre', label: 'Septiembre' },
  { key: 'octubre', label: 'Octubre' },
  { key: 'noviembre', label: 'Noviembre' },
  { key: 'diciembre', label: 'Diciembre' },
] as const;

export const TALLAS_OFICIALES = [
  { key: 'talla_10', label: 'Talla 10' },
  { key: 'talla_12', label: 'Talla 12' },
  { key: 'talla_14', label: 'Talla 14' },
  { key: 'talla_16', label: 'Talla 16' },
  { key: 'talla_s', label: 'Talla S' },
  { key: 'talla_m', label: 'Talla M' },
  { key: 'talla_l', label: 'Talla L' },
  { key: 'talla_xl', label: 'Talla XL' },
  { key: 'talla_xxl', label: 'Talla XXL' },
] as const;

const STORAGE_MATERIALES_KEY = '@cache_materiales_sedes';
const STORAGE_INDUMENTARIA_KEY = '@cache_indumentaria_sedes';

/**
 * Obtiene la lista de sedes registradas en los inventarios
 */
export async function fetchSedesInventario(): Promise<string[]> {
  try {
    const { data: matSedes } = await supabase
      .from('inventario_materiales_sedes')
      .select('sede_nombre');

    const { data: indSedes } = await supabase
      .from('inventario_indumentaria_sedes')
      .select('sede_nombre');

    const sedesSet = new Set<string>();
    (matSedes || []).forEach((r) => r.sede_nombre && sedesSet.add(r.sede_nombre.toUpperCase().trim()));
    (indSedes || []).forEach((r) => r.sede_nombre && sedesSet.add(r.sede_nombre.toUpperCase().trim()));

    if (sedesSet.size === 0) {
      return ['TRINIDAD', 'LIBERTADOR', 'ELVIRA', 'LICEO', 'CRISTO REY', 'BUENAS NUEVAS', 'FATIMA'];
    }

    return Array.from(sedesSet).sort();
  } catch (e) {
    console.warn('Error al obtener lista de sedes de inventario:', e);
    return ['TRINIDAD', 'LIBERTADOR', 'ELVIRA', 'LICEO', 'CRISTO REY', 'BUENAS NUEVAS', 'FATIMA'];
  }
}

/**
 * Obtiene los materiales de una sede específica
 */
export async function fetchMaterialesPorSede(sedeNombre: string): Promise<MaterialSede[]> {
  const normSede = sedeNombre.toUpperCase().trim();
  try {
    const { data, error } = await supabase
      .from('inventario_materiales_sedes')
      .select('*')
      .ilike('sede_nombre', normSede)
      .order('id', { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      await AsyncStorage.setItem(`${STORAGE_MATERIALES_KEY}_${normSede}`, JSON.stringify(data));
      return data as MaterialSede[];
    }

    // Fallback: Si no tiene materiales propios, podemos consultar la plantilla base (TRINIDAD)
    const { data: baseData } = await supabase
      .from('inventario_materiales_sedes')
      .select('*')
      .ilike('sede_nombre', 'TRINIDAD')
      .order('id', { ascending: true });

    if (baseData && baseData.length > 0) {
      // Plantilla lista para que el usuario registre la nueva sede
      return baseData.map((m) => ({
        ...m,
        id: 0,
        sede_nombre: normSede,
        marzo: 0,
        abril: 0,
        mayo: 0,
        junio: 0,
        julio: 0,
        agosto: 0,
        septiembre: 0,
        octubre: 0,
        noviembre: 0,
        diciembre: 0,
      }));
    }

    return [];
  } catch (e) {
    console.warn(`Fallback offline para materiales de ${normSede}:`, e);
    const cached = await AsyncStorage.getItem(`${STORAGE_MATERIALES_KEY}_${normSede}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    return [];
  }
}

/**
 * Guarda o actualiza un material deportivo en la sede
 */
export async function guardarMaterialSede(material: Partial<MaterialSede> & {
  sede_nombre: string;
  material_nombre: string;
}): Promise<MaterialSede> {
  const payload = {
    sede_nombre: material.sede_nombre.toUpperCase().trim(),
    material_nombre: material.material_nombre.trim(),
    categoria: material.categoria || 'Material Deportivo',
    marzo: material.marzo ?? 0,
    abril: material.abril ?? 0,
    mayo: material.mayo ?? 0,
    junio: material.junio ?? 0,
    julio: material.julio ?? 0,
    agosto: material.agosto ?? 0,
    septiembre: material.septiembre ?? 0,
    octubre: material.octubre ?? 0,
    noviembre: material.noviembre ?? 0,
    diciembre: material.diciembre ?? 0,
    notas: material.notas || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('inventario_materiales_sedes')
    .upsert(payload, { onConflict: 'sede_nombre,material_nombre' })
    .select()
    .single();

  if (error) {
    console.error('Error al guardar material:', error);
    throw error;
  }

  return data as MaterialSede;
}

/**
 * Elimina un material deportivo
 */
export async function eliminarMaterialSede(id: number): Promise<void> {
  const { error } = await supabase
    .from('inventario_materiales_sedes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error al eliminar material:', error);
    throw error;
  }
}

/**
 * Obtiene toda la indumentaria por tallas de todas las sedes
 */
export async function fetchIndumentariaTodasSedes(): Promise<IndumentariaSede[]> {
  try {
    const { data, error } = await supabase
      .from('inventario_indumentaria_sedes')
      .select('*')
      .order('sede_nombre', { ascending: true });

    if (error) throw error;

    const calculados = (data || []).map((row: any) => ({
      ...row,
      total:
        (row.talla_10 || 0) +
        (row.talla_12 || 0) +
        (row.talla_14 || 0) +
        (row.talla_16 || 0) +
        (row.talla_s || 0) +
        (row.talla_m || 0) +
        (row.talla_l || 0) +
        (row.talla_xl || 0) +
        (row.talla_xxl || 0),
    }));

    await AsyncStorage.setItem(STORAGE_INDUMENTARIA_KEY, JSON.stringify(calculados));
    return calculados;
  } catch (e) {
    console.warn('Fallback offline para indumentaria:', e);
    const cached = await AsyncStorage.getItem(STORAGE_INDUMENTARIA_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    return [];
  }
}

/**
 * Guarda o actualiza las tallas de indumentaria para una sede
 */
export async function guardarIndumentariaSede(
  sedeNombre: string,
  tallas: {
    talla_10?: number;
    talla_12?: number;
    talla_14?: number;
    talla_16?: number;
    talla_s?: number;
    talla_m?: number;
    talla_l?: number;
    talla_xl?: number;
    talla_xxl?: number;
    notas?: string;
  }
): Promise<IndumentariaSede> {
  const payload = {
    sede_nombre: sedeNombre.toUpperCase().trim(),
    talla_10: Math.max(0, tallas.talla_10 || 0),
    talla_12: Math.max(0, tallas.talla_12 || 0),
    talla_14: Math.max(0, tallas.talla_14 || 0),
    talla_16: Math.max(0, tallas.talla_16 || 0),
    talla_s: Math.max(0, tallas.talla_s || 0),
    talla_m: Math.max(0, tallas.talla_m || 0),
    talla_l: Math.max(0, tallas.talla_l || 0),
    talla_xl: Math.max(0, tallas.talla_xl || 0),
    talla_xxl: Math.max(0, tallas.talla_xxl || 0),
    notas: tallas.notas || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('inventario_indumentaria_sedes')
    .upsert(payload, { onConflict: 'sede_nombre' })
    .select()
    .single();

  if (error) {
    console.error('Error al guardar indumentaria:', error);
    throw error;
  }

  return {
    ...data,
    total:
      (data.talla_10 || 0) +
      (data.talla_12 || 0) +
      (data.talla_14 || 0) +
      (data.talla_16 || 0) +
      (data.talla_s || 0) +
      (data.talla_m || 0) +
      (data.talla_l || 0) +
      (data.talla_xl || 0) +
      (data.talla_xxl || 0),
  } as IndumentariaSede;
}
