import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import {
  Evento,
  VentaEntrada,
  ColaboradorResumen,
  MetricasVentas,
  DatosEmisionEntrada,
  ResultadoEmision,
  PreRegistroEntrada,
  DatosCrearPreRegistro,
  ResultadoPreRegistro,
} from '../types/entradas';

/**
 * Obtiene el evento activo directamente desde la base de datos Supabase.
 * NO tiene valores por defecto ni precios fijos en código: todo proviene de la tabla 'eventos'.
 */
export async function fetchEventoActivo(): Promise<Evento | null> {
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .eq('estado', 'ACTIVO')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error al consultar evento activo en Supabase:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    nombre: data.nombre,
    lugar: data.lugar,
    precio_entrada: Number(data.precio_entrada),
    aforo_maximo: data.aforo_maximo ? Number(data.aforo_maximo) : null,
    estado: data.estado,
    yape_numero: data.yape_numero || null,
    yape_titular: data.yape_titular || null,
    yape_imagen_url: data.yape_imagen_url || null,
    created_at: data.created_at,
  };
}

/**
 * Consulta las ventas de un evento y calcula las métricas tanto del colaborador como globales.
 */
export async function fetchMetricasYVentas(
  eventoId: number,
  nombreColaborador: string,
  aforoMaximo: number | null
): Promise<{
  metricas: MetricasVentas;
  misVentas: VentaEntrada[];
  todasVentas: VentaEntrada[];
}> {
  const { data, error } = await supabase
    .from('ventas_entradas')
    .select('*')
    .eq('evento_id', eventoId)
    .order('id', { ascending: false });

  if (error) {
    console.error('Error al consultar ventas de entradas:', error);
    throw error;
  }

  const todasVentas: VentaEntrada[] = (data || []).map((row: any) => ({
    id: row.id,
    evento_id: row.evento_id,
    numero_ticket_inicio: row.numero_ticket_inicio,
    numero_ticket_fin: row.numero_ticket_fin,
    cantidad: row.cantidad,
    precio_unitario: Number(row.precio_unitario),
    monto_total: Number(row.monto_total),
    metodo_pago: row.metodo_pago,
    monto_recibido: row.monto_recibido ? Number(row.monto_recibido) : null,
    vuelto: row.vuelto ? Number(row.vuelto) : 0,
    nombre_completo: row.nombre_completo,
    dni: row.dni,
    asistentes: row.asistentes || null,
    url_comprobante: row.url_comprobante,
    colaborador_id: row.colaborador_id,
    colaborador_nombre: row.colaborador_nombre || 'Colaborador',
    notas: row.notas,
    estado: row.estado,
    motivo_anulacion: row.motivo_anulacion,
    fecha: row.fecha,
  }));

  const activas = todasVentas.filter((v) => v.estado === 'COMPLETADA');
  const misActivas = activas.filter((v) => v.colaborador_nombre === nombreColaborador);

  const misEntradas = misActivas.reduce((acc, v) => acc + (v.cantidad || 0), 0);
  const miTotal = misActivas.reduce((acc, v) => acc + v.monto_total, 0);

  const globalEntradas = activas.reduce((acc, v) => acc + (v.cantidad || 0), 0);
  const globalTotal = activas.reduce((acc, v) => acc + v.monto_total, 0);

  const entradasDisponibles =
    aforoMaximo !== null ? Math.max(0, aforoMaximo - globalEntradas) : null;

  const misVentas = todasVentas.filter((v) => v.colaborador_nombre === nombreColaborador);

  return {
    metricas: {
      misEntradas,
      miTotal,
      globalEntradas,
      globalTotal,
      aforoMaximo,
      entradasDisponibles,
    },
    misVentas,
    todasVentas,
  };
}

/**
 * Sube una imagen de comprobante (foto o galería) al bucket 'comprobantes' de Supabase Storage.
 */
export async function uploadComprobanteEntrada(
  asset: any,
  eventoId: number
): Promise<string | null> {
  if (!asset || !asset.base64) return null;

  try {
    const timestamp = Date.now();
    const fileName = `entradas/evento_${eventoId}_${timestamp}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(fileName, decode(asset.base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Advertencia al subir comprobante a Supabase Storage:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(fileName);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn('Fallo inesperado al subir comprobante:', err);
    return null;
  }
}

/**
 * Emite una venta de entradas llamando al procedimiento atómico de PostgreSQL.
 * Garantiza total seguridad y números correlativos no repetidos entre los 5 colaboradores simultáneos.
 */
export async function emitirVentaEntradas(
  params: DatosEmisionEntrada
): Promise<ResultadoEmision> {
  const montoTotal = Number((params.cantidad * params.precioUnitario).toFixed(2));

  let urlComprobante: string | null = null;
  if (params.comprobanteAsset) {
    urlComprobante = await uploadComprobanteEntrada(params.comprobanteAsset, params.eventoId);
  }

  const { data, error } = await supabase.rpc('emitir_entradas_atomica', {
    p_evento_id: params.eventoId,
    p_cantidad: params.cantidad,
    p_precio_unitario: params.precioUnitario,
    p_monto_total: montoTotal,
    p_metodo_pago: params.metodoPago,
    p_monto_recibido: params.montoRecibido || null,
    p_vuelto: params.vuelto || 0,
    p_nombre_completo: params.nombreCompleto?.trim() || null,
    p_dni: params.dni?.trim() || null,
    p_url_comprobante: urlComprobante,
    p_colaborador_id: params.colaboradorId || null,
    p_colaborador_nombre: params.colaboradorNombre || 'Colaborador',
    p_notas: params.notas || null,
    p_asistentes: params.asistentes || [],
  });

  if (error) {
    console.error('Error RPC emitir_entradas_atomica:', error);
    throw new Error(error.message || 'Error al procesar la venta en la base de datos.');
  }

  const resultado = data as ResultadoEmision;

  // Si esta venta proviene de un pre-registro web, marcarlo automáticamente como COBRADO
  if (params.preRegistroCodigo && resultado.venta_id) {
    try {
      await marcarPreRegistroCobrado(
        params.preRegistroCodigo,
        resultado.venta_id,
        params.colaboradorNombre || 'Colaborador'
      );
    } catch (e) {
      console.warn('No se pudo marcar pre-registro como cobrado:', e);
    }
  }

  return resultado;
}

/**
 * Agrupa ventas completadas por colaborador para el monitor administrativo.
 */
export function procesarResumenColaboradores(ventas: VentaEntrada[]): ColaboradorResumen[] {
  const activas = ventas.filter((v) => v.estado === 'COMPLETADA');
  const mapa: Record<string, ColaboradorResumen> = {};

  activas.forEach((v) => {
    const nombre = v.colaborador_nombre || 'Colaborador';
    if (!mapa[nombre]) {
      mapa[nombre] = {
        nombre,
        entradas: 0,
        efectivo: 0,
        yape: 0,
        plin: 0,
        otros: 0,
        total: 0,
        transacciones: 0,
      };
    }

    const monto = v.monto_total || 0;
    mapa[nombre].entradas += v.cantidad || 0;
    mapa[nombre].total += monto;
    mapa[nombre].transacciones += 1;

    if (v.metodo_pago === 'Efectivo') {
      mapa[nombre].efectivo += monto;
    } else if (v.metodo_pago === 'Yape') {
      mapa[nombre].yape += monto;
    } else if (v.metodo_pago === 'Plin') {
      mapa[nombre].plin += monto;
    } else {
      mapa[nombre].otros += monto;
    }
  });

  return Object.values(mapa).sort((a, b) => b.total - a.total);
}

/**
 * Sube la imagen con los datos / QR de Yape al bucket 'comprobantes' de Supabase Storage.
 */
export async function uploadImagenYape(
  asset: any,
  eventoId?: number
): Promise<string | null> {
  if (!asset || !asset.base64) return null;

  try {
    const timestamp = Date.now();
    const fileName = `yape/yape_evento_${eventoId || 'nuevo'}_${timestamp}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(fileName, decode(asset.base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Advertencia al subir imagen Yape a Supabase Storage:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(fileName);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn('Fallo inesperado al subir imagen Yape:', err);
    return null;
  }
}

/**
 * Guarda o actualiza los datos del evento directamente en la base de datos.
 */
export async function guardarConfiguracionEvento(datos: {
  id?: number;
  nombre: string;
  lugar?: string;
  precio_entrada: number;
  aforo_maximo?: number | null;
  estado?: 'ACTIVO' | 'PAUSADO' | 'FINALIZADO';
  yape_numero?: string | null;
  yape_titular?: string | null;
  yape_imagen_url?: string | null;
}): Promise<Evento> {
  const payload: any = {
    nombre: datos.nombre.trim(),
    lugar: datos.lugar?.trim() || null,
    precio_entrada: datos.precio_entrada,
    aforo_maximo: datos.aforo_maximo || null,
    estado: datos.estado || 'ACTIVO',
  };

  if (datos.yape_numero !== undefined) {
    payload.yape_numero = datos.yape_numero?.trim() || null;
  }
  if (datos.yape_titular !== undefined) {
    payload.yape_titular = datos.yape_titular?.trim() || null;
  }
  if (datos.yape_imagen_url !== undefined) {
    payload.yape_imagen_url = datos.yape_imagen_url || null;
  }

  if (datos.id) {
    const { data, error } = await supabase
      .from('eventos')
      .update(payload)
      .eq('id', datos.id)
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      nombre: data.nombre,
      lugar: data.lugar,
      precio_entrada: Number(data.precio_entrada),
      aforo_maximo: data.aforo_maximo ? Number(data.aforo_maximo) : null,
      estado: data.estado,
      yape_numero: data.yape_numero || null,
      yape_titular: data.yape_titular || null,
      yape_imagen_url: data.yape_imagen_url || null,
      created_at: data.created_at,
    };
  } else {
    const { data, error } = await supabase
      .from('eventos')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      nombre: data.nombre,
      lugar: data.lugar,
      precio_entrada: Number(data.precio_entrada),
      aforo_maximo: data.aforo_maximo ? Number(data.aforo_maximo) : null,
      estado: data.estado,
      yape_numero: data.yape_numero || null,
      yape_titular: data.yape_titular || null,
      yape_imagen_url: data.yape_imagen_url || null,
      created_at: data.created_at,
    };
  }
}

/**
 * Lista todos los eventos (activos y finalizados) para el selector e historial administrativo.
 */
export async function fetchTodosLosEventos(): Promise<Evento[]> {
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error('Error al listar eventos:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    nombre: row.nombre,
    lugar: row.lugar,
    precio_entrada: Number(row.precio_entrada),
    aforo_maximo: row.aforo_maximo ? Number(row.aforo_maximo) : null,
    estado: row.estado,
    yape_numero: row.yape_numero || null,
    yape_titular: row.yape_titular || null,
    yape_imagen_url: row.yape_imagen_url || null,
    created_at: row.created_at,
  }));
}

/**
 * Crea un nuevo evento ACTIVO desde cero (Ticket #1) y pasa los eventos activos previos a FINALIZADO
 * conservando intacto su historial y ventas.
 */
export async function crearNuevoEventoYFinalizarAnteriores(datos: {
  nombre: string;
  lugar?: string;
  precio_entrada: number;
  aforo_maximo?: number | null;
  yape_numero?: string | null;
  yape_titular?: string | null;
  yape_imagen_url?: string | null;
}): Promise<Evento> {
  // 1. Marcar cualquier evento ACTIVO anterior como FINALIZADO
  const { error: errClose } = await supabase
    .from('eventos')
    .update({ estado: 'FINALIZADO' })
    .eq('estado', 'ACTIVO');

  if (errClose) {
    console.error('Error al finalizar eventos previos:', errClose);
    throw errClose;
  }

  // 2. Insertar el nuevo evento ACTIVO con contador de tickets limpio en 0
  const payload = {
    nombre: datos.nombre.trim(),
    lugar: datos.lugar?.trim() || null,
    precio_entrada: datos.precio_entrada,
    aforo_maximo: datos.aforo_maximo || null,
    estado: 'ACTIVO',
    ultimo_ticket_emitido: 0,
    yape_numero: datos.yape_numero?.trim() || null,
    yape_titular: datos.yape_titular?.trim() || null,
    yape_imagen_url: datos.yape_imagen_url || null,
  };

  const { data, error } = await supabase
    .from('eventos')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error al crear nuevo evento:', error);
    throw error;
  }

  return {
    id: data.id,
    nombre: data.nombre,
    lugar: data.lugar,
    precio_entrada: Number(data.precio_entrada),
    aforo_maximo: data.aforo_maximo ? Number(data.aforo_maximo) : null,
    estado: data.estado,
    yape_numero: data.yape_numero || null,
    yape_titular: data.yape_titular || null,
    yape_imagen_url: data.yape_imagen_url || null,
    created_at: data.created_at,
  };
}

/**
 * Reactiva un evento existente y pasa los demás eventos activos a FINALIZADO.
 */
export async function activarEvento(eventoId: number): Promise<void> {
  const { error: errClose } = await supabase
    .from('eventos')
    .update({ estado: 'FINALIZADO' })
    .eq('estado', 'ACTIVO');

  if (errClose) throw errClose;

  const { error } = await supabase
    .from('eventos')
    .update({ estado: 'ACTIVO' })
    .eq('id', eventoId);

  if (error) throw error;
}

/**
 * Finaliza un evento activo (lo deja solo para consulta histórica).
 */
export async function finalizarEvento(eventoId: number): Promise<void> {
  const { error } = await supabase
    .from('eventos')
    .update({ estado: 'FINALIZADO' })
    .eq('id', eventoId);

  if (error) throw error;
}

/**
 * Anula una venta de entradas en la base de datos (función administrativa).
 */
export async function anularVentaEntrada(ventaId: number, motivo: string): Promise<void> {
  const { error } = await supabase
    .from('ventas_entradas')
    .update({
      estado: 'ANULADA',
      motivo_anulacion: motivo.trim() || 'Anulado por Administración',
    })
    .eq('id', ventaId);

  if (error) {
    console.error('Error al anular venta:', error);
    throw error;
  }
}

/**
 * ==============================================================================
 * SERVICIOS DE PRE-REGISTRO WEB (AUTOGESTIÓN POR QR)
 * ==============================================================================
 */

/**
 * Registra un nuevo pre-registro de entrada realizado por el comprador/padre desde la web.
 * Genera un código único (ej. CCL-1001) para presentarlo en la entrada.
 */
export async function crearPreRegistro(
  datos: DatosCrearPreRegistro
): Promise<ResultadoPreRegistro> {
  const montoTotal = Number((datos.cantidad * datos.precioUnitario).toFixed(2));

  const { data, error } = await supabase.rpc('crear_preregistro_entrada', {
    p_evento_id: datos.eventoId,
    p_nombre_titular: datos.nombreTitular.trim(),
    p_dni_titular: datos.dniTitular.trim(),
    p_telefono: datos.telefono?.trim() || null,
    p_cantidad: datos.cantidad,
    p_precio_unitario: datos.precioUnitario,
    p_monto_total: montoTotal,
    p_asistentes: datos.asistentes || [],
  });

  if (error) {
    console.error('Error al crear pre-registro:', error);
    throw new Error(error.message || 'No se pudo generar el pre-registro.');
  }

  return data as ResultadoPreRegistro;
}

/**
 * Busca un pre-registro por código (ej. "CCL-1001" o "1001") o por DNI del titular.
 * Permite al personal en puerta encontrarlo en un segundo.
 */
export async function buscarPreRegistroPorCodigo(
  termino: string,
  eventoId?: number
): Promise<PreRegistroEntrada | null> {
  const limpio = (termino || '').trim();
  if (!limpio) return null;

  const codigoNormalizado = limpio.toUpperCase();
  const codigoConPrefijo = codigoNormalizado.startsWith('CCL-')
    ? codigoNormalizado
    : `CCL-${codigoNormalizado.padStart(4, '0')}`;

  let query = supabase.from('pre_registros_entradas').select('*');

  if (eventoId) {
    query = query.eq('evento_id', eventoId);
  }

  // Buscar por código exacto o con prefijo CCL-
  const { data: porCodigo, error: errCodigo } = await query
    .or(`codigo.eq.${codigoNormalizado},codigo.eq.${codigoConPrefijo}`)
    .limit(1)
    .maybeSingle();

  if (porCodigo && !errCodigo) {
    return {
      ...porCodigo,
      precio_unitario: Number(porCodigo.precio_unitario),
      monto_total: Number(porCodigo.monto_total),
    } as PreRegistroEntrada;
  }

  // Si no se encontró por código, intentar buscar por DNI o por Nombre
  let dniQuery = supabase
    .from('pre_registros_entradas')
    .select('*')
    .eq('dni_titular', limpio)
    .order('id', { ascending: false });

  if (eventoId) {
    dniQuery = dniQuery.eq('evento_id', eventoId);
  }

  const { data: porDni } = await dniQuery.limit(1).maybeSingle();

  if (porDni) {
    return {
      ...porDni,
      precio_unitario: Number(porDni.precio_unitario),
      monto_total: Number(porDni.monto_total),
    } as PreRegistroEntrada;
  }

  // Búsqueda por Nombre del Titular (si escribió su apellido o nombre completo)
  if (limpio.length >= 3) {
    let nombreQuery = supabase
      .from('pre_registros_entradas')
      .select('*')
      .ilike('nombre_titular', `%${limpio}%`)
      .order('id', { ascending: false });

    if (eventoId) {
      nombreQuery = nombreQuery.eq('evento_id', eventoId);
    }

    const { data: porNombre } = await nombreQuery.limit(1).maybeSingle();
    if (porNombre) {
      return {
        ...porNombre,
        precio_unitario: Number(porNombre.precio_unitario),
        monto_total: Number(porNombre.monto_total),
      } as PreRegistroEntrada;
    }
  }

  return null;
}

/**
 * Busca pre-registros por DNI, Nombre o Código para recuperar pases en puerta.
 * Retorna lista de coincidencias para que el colaborador seleccione la correcta.
 */
export async function buscarPreRegistrosPorDniONombre(
  termino: string,
  eventoId?: number
): Promise<PreRegistroEntrada[]> {
  const limpio = (termino || '').trim();
  if (!limpio) return [];

  let query = supabase.from('pre_registros_entradas').select('*');
  if (eventoId) {
    query = query.eq('evento_id', eventoId);
  }

  const codigoNormalizado = limpio.toUpperCase();
  const codigoConPrefijo = codigoNormalizado.startsWith('CCL-')
    ? codigoNormalizado
    : `CCL-${codigoNormalizado.padStart(4, '0')}`;

  const { data, error } = await query
    .or(`codigo.eq.${codigoNormalizado},codigo.eq.${codigoConPrefijo},dni_titular.ilike.%${limpio}%,nombre_titular.ilike.%${limpio}%`)
    .order('id', { ascending: false })
    .limit(10);

  if (error || !data) {
    console.warn('Error al buscar pre-registros por DNI/Nombre:', error);
    return [];
  }

  return data.map((item) => ({
    ...item,
    precio_unitario: Number(item.precio_unitario),
    monto_total: Number(item.monto_total),
  })) as PreRegistroEntrada[];
}

/**
 * Marca el pre-registro como cobrado cuando el personal en boletería emite los tickets.
 */
export async function marcarPreRegistroCobrado(
  codigo: string,
  ventaId: number,
  atendidoPor: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('marcar_preregistro_cobrado', {
    p_codigo: codigo,
    p_venta_id: ventaId,
    p_atendido_por: atendidoPor,
  });

  if (error) {
    console.warn('Error al marcar pre-registro como cobrado:', error);
    return false;
  }

  return !!data?.success;
}
