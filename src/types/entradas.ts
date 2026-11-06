import { ImagePickerAsset } from 'expo-image-picker';

export interface Evento {
  id: number;
  nombre: string;
  lugar: string | null;
  precio_entrada: number;
  aforo_maximo: number | null;
  estado: 'ACTIVO' | 'PAUSADO' | 'FINALIZADO';
  created_at?: string;
}

export type MetodoPagoEntrada = 'Efectivo' | 'Yape' | 'Plin' | 'Tarjeta' | 'Transferencia';

export interface VentaEntrada {
  id: number;
  evento_id: number;
  numero_ticket_inicio: number;
  numero_ticket_fin: number;
  cantidad: number;
  precio_unitario: number;
  monto_total: number;
  metodo_pago: MetodoPagoEntrada;
  monto_recibido?: number | null;
  vuelto?: number | null;
  nombre_completo?: string | null;
  dni?: string | null;
  url_comprobante?: string | null;
  colaborador_id?: number | null;
  colaborador_nombre: string;
  notas?: string | null;
  estado: 'COMPLETADA' | 'ANULADA';
  motivo_anulacion?: string | null;
  fecha: string;
}

export interface ColaboradorResumen {
  nombre: string;
  entradas: number;
  efectivo: number;
  yape: number;
  plin: number;
  otros: number;
  total: number;
  transacciones: number;
}

export interface MetricasVentas {
  misEntradas: number;
  miTotal: number;
  globalEntradas: number;
  globalTotal: number;
  aforoMaximo: number | null;
  entradasDisponibles: number | null;
}

export interface DatosEmisionEntrada {
  eventoId: number;
  cantidad: number;
  precioUnitario: number;
  metodoPago: MetodoPagoEntrada;
  montoRecibido?: number | null;
  vuelto?: number | null;
  nombreCompleto?: string;
  dni?: string;
  comprobanteAsset?: ImagePickerAsset | null;
  colaboradorId?: number | null;
  colaboradorNombre: string;
  notas?: string;
}

export interface ResultadoEmision {
  success: boolean;
  venta_id: number;
  ticket_inicio: number;
  ticket_fin: number;
  cantidad: number;
  monto_total: number;
  metodo_pago: string;
  vuelto?: number;
  colaborador_nombre: string;
  nombre_completo?: string;
  dni?: string;
}
