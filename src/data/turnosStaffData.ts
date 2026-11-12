export interface TurnoStaff {
  id: string;
  sede: string;
  espacio: string;
  frecuencia: 'LMV' | 'MJ' | 'MV' | 'LUN';
  dias: string[];
  diasTexto: string;
  horario: string;
  horaInicio: number; // Minutos desde medianoche
  horaFin: number; // Minutos desde medianoche
  horasPorDia: number;
  diasPorSemana: number;
  horasSemanales: number;
}

export interface CandidatoStaff {
  id: string;
  fecha: string;
  nombre: string;
  telefono: string;
  distrito: string;
  edad: string;
  calificacion: number;
  notas: string;
  turnos: TurnoStaff[];
  totalHoras: number;
  totalTurnos: number;
}

export interface ConflictInfo {
  hasConflict: boolean;
  motivo?: string;
  chocaConSede?: string;
}

export const SEDES_LISTA = [
  'Todas',
  'Cristo Rey',
  'Liceo Naval',
  'Santísima Trinidad',
  'Elvira García y García',
  'Libertador',
  'Buenas Nuevas',
  'Fátima',
];

export const TURNOS_OFICIALES: TurnoStaff[] = [
  // Cristo Rey
  {
    id: 'cr-1',
    sede: 'Cristo Rey',
    espacio: 'Campo Mañana',
    frecuencia: 'LMV',
    dias: ['LUN', 'MIE', 'VIE'],
    diasTexto: 'Lun, Mié, Vie',
    horario: '10:00 - 13:00',
    horaInicio: 600,
    horaFin: 780,
    horasPorDia: 3,
    diasPorSemana: 3,
    horasSemanales: 9,
  },
  {
    id: 'cr-2',
    sede: 'Cristo Rey',
    espacio: 'Campo Tarde',
    frecuencia: 'LMV',
    dias: ['LUN', 'MIE', 'VIE'],
    diasTexto: 'Lun, Mié, Vie',
    horario: '17:00 - 20:30',
    horaInicio: 1020,
    horaFin: 1230,
    horasPorDia: 3.5,
    diasPorSemana: 3,
    horasSemanales: 10.5,
  },
  {
    id: 'cr-3',
    sede: 'Cristo Rey',
    espacio: 'Salón Mañana',
    frecuencia: 'MV',
    dias: ['MAR', 'VIE'],
    diasTexto: 'Mar, Vie',
    horario: '10:00 - 12:00',
    horaInicio: 600,
    horaFin: 720,
    horasPorDia: 2,
    diasPorSemana: 2,
    horasSemanales: 4,
  },
  {
    id: 'cr-4',
    sede: 'Cristo Rey',
    espacio: 'Salón Tarde',
    frecuencia: 'MV',
    dias: ['MAR', 'VIE'],
    diasTexto: 'Mar, Vie',
    horario: '17:00 - 20:30',
    horaInicio: 1020,
    horaFin: 1230,
    horasPorDia: 3.5,
    diasPorSemana: 2,
    horasSemanales: 7,
  },
  {
    id: 'cr-5',
    sede: 'Cristo Rey',
    espacio: 'Campo Tarde',
    frecuencia: 'MJ',
    dias: ['MAR', 'JUE'],
    diasTexto: 'Mar, Jue',
    horario: '17:00 - 20:30',
    horaInicio: 1020,
    horaFin: 1230,
    horasPorDia: 3.5,
    diasPorSemana: 2,
    horasSemanales: 7,
  },
  {
    id: 'cr-6',
    sede: 'Cristo Rey',
    espacio: 'Salón Tarde',
    frecuencia: 'MJ',
    dias: ['MAR', 'JUE'],
    diasTexto: 'Mar, Jue',
    horario: '17:00 - 20:30',
    horaInicio: 1020,
    horaFin: 1230,
    horasPorDia: 3.5,
    diasPorSemana: 2,
    horasSemanales: 7,
  },
  {
    id: 'cr-7',
    sede: 'Cristo Rey',
    espacio: 'Salón Mañana',
    frecuencia: 'MJ',
    dias: ['MAR', 'JUE'],
    diasTexto: 'Mar, Jue',
    horario: '09:00 - 12:00',
    horaInicio: 540,
    horaFin: 720,
    horasPorDia: 3,
    diasPorSemana: 2,
    horasSemanales: 6,
  },

  // Liceo Naval
  {
    id: 'ln-1',
    sede: 'Liceo Naval',
    espacio: 'Campo Tarde',
    frecuencia: 'LMV',
    dias: ['LUN', 'MIE', 'VIE'],
    diasTexto: 'Lun, Mié, Vie',
    horario: '17:00 - 20:30',
    horaInicio: 1020,
    horaFin: 1230,
    horasPorDia: 3.5,
    diasPorSemana: 3,
    horasSemanales: 10.5,
  },
  {
    id: 'ln-2',
    sede: 'Liceo Naval',
    espacio: 'Tarima Tarde',
    frecuencia: 'MV',
    dias: ['MAR', 'VIE'],
    diasTexto: 'Mar, Vie',
    horario: '17:00 - 20:30',
    horaInicio: 1020,
    horaFin: 1230,
    horasPorDia: 3.5,
    diasPorSemana: 2,
    horasSemanales: 7,
  },
  {
    id: 'ln-3',
    sede: 'Liceo Naval',
    espacio: 'Tarima Tarde',
    frecuencia: 'LUN',
    dias: ['LUN'],
    diasTexto: 'Lun',
    horario: '17:00 - 20:30',
    horaInicio: 1020,
    horaFin: 1230,
    horasPorDia: 3.5,
    diasPorSemana: 1,
    horasSemanales: 3.5,
  },
  {
    id: 'ln-4',
    sede: 'Liceo Naval',
    espacio: 'Tarima Tarde',
    frecuencia: 'MJ',
    dias: ['MAR', 'JUE'],
    diasTexto: 'Mar, Jue',
    horario: '17:00 - 20:30',
    horaInicio: 1020,
    horaFin: 1230,
    horasPorDia: 3.5,
    diasPorSemana: 2,
    horasSemanales: 7,
  },
  {
    id: 'ln-5',
    sede: 'Liceo Naval',
    espacio: 'Campo Tarde',
    frecuencia: 'MJ',
    dias: ['MAR', 'JUE'],
    diasTexto: 'Mar, Jue',
    horario: '17:00 - 20:30',
    horaInicio: 1020,
    horaFin: 1230,
    horasPorDia: 3.5,
    diasPorSemana: 2,
    horasSemanales: 7,
  },

  // Santísima Trinidad
  {
    id: 'st-1',
    sede: 'Santísima Trinidad',
    espacio: 'Campo Tarde',
    frecuencia: 'MJ',
    dias: ['MAR', 'JUE'],
    diasTexto: 'Mar, Jue',
    horario: '18:00 - 21:00',
    horaInicio: 1080,
    horaFin: 1260,
    horasPorDia: 3,
    diasPorSemana: 2,
    horasSemanales: 6,
  },

  // Elvira García y García (4 turnos: 2 de Vóley y 2 de Básquet)
  {
    id: 'eg-v1',
    sede: 'Elvira García y García',
    espacio: 'Vóley (Campo Tarde)',
    frecuencia: 'LMV',
    dias: ['LUN', 'MIE', 'VIE'],
    diasTexto: 'Lun, Mié, Vie',
    horario: '18:15 - 21:15',
    horaInicio: 1095,
    horaFin: 1275,
    horasPorDia: 3,
    diasPorSemana: 3,
    horasSemanales: 9,
  },
  {
    id: 'eg-v2',
    sede: 'Elvira García y García',
    espacio: 'Vóley (Campo Tarde)',
    frecuencia: 'MJ',
    dias: ['MAR', 'JUE'],
    diasTexto: 'Mar, Jue',
    horario: '18:15 - 21:15',
    horaInicio: 1095,
    horaFin: 1275,
    horasPorDia: 3,
    diasPorSemana: 2,
    horasSemanales: 6,
  },
  {
    id: 'eg-b1',
    sede: 'Elvira García y García',
    espacio: 'Básquet (Campo Tarde)',
    frecuencia: 'LMV',
    dias: ['LUN', 'MIE', 'VIE'],
    diasTexto: 'Lun, Mié, Vie',
    horario: '18:15 - 21:15',
    horaInicio: 1095,
    horaFin: 1275,
    horasPorDia: 3,
    diasPorSemana: 3,
    horasSemanales: 9,
  },
  {
    id: 'eg-b2',
    sede: 'Elvira García y García',
    espacio: 'Básquet (Campo Tarde)',
    frecuencia: 'MJ',
    dias: ['MAR', 'JUE'],
    diasTexto: 'Mar, Jue',
    horario: '18:15 - 21:15',
    horaInicio: 1095,
    horaFin: 1275,
    horasPorDia: 3,
    diasPorSemana: 2,
    horasSemanales: 6,
  },

  // Libertador
  {
    id: 'lib-1',
    sede: 'Libertador',
    espacio: 'Campo Tarde',
    frecuencia: 'LMV',
    dias: ['LUN', 'MIE', 'VIE'],
    diasTexto: 'Lun, Mié, Vie',
    horario: '16:30 - 20:00',
    horaInicio: 990,
    horaFin: 1200,
    horasPorDia: 3.5,
    diasPorSemana: 3,
    horasSemanales: 10.5,
  },
  {
    id: 'lib-2',
    sede: 'Libertador',
    espacio: 'Patio Tarde',
    frecuencia: 'MV',
    dias: ['MAR', 'VIE'],
    diasTexto: 'Mar, Vie',
    horario: '16:30 - 20:00',
    horaInicio: 990,
    horaFin: 1200,
    horasPorDia: 3.5,
    diasPorSemana: 2,
    horasSemanales: 7,
  },
  {
    id: 'lib-3',
    sede: 'Libertador',
    espacio: 'Patio Tarde',
    frecuencia: 'LUN',
    dias: ['LUN'],
    diasTexto: 'Lun',
    horario: '16:30 - 20:00',
    horaInicio: 990,
    horaFin: 1200,
    horasPorDia: 3.5,
    diasPorSemana: 1,
    horasSemanales: 3.5,
  },
  {
    id: 'lib-4',
    sede: 'Libertador',
    espacio: 'Campo Tarde',
    frecuencia: 'MJ',
    dias: ['MAR', 'JUE'],
    diasTexto: 'Mar, Jue',
    horario: '16:30 - 20:00',
    horaInicio: 990,
    horaFin: 1200,
    horasPorDia: 3.5,
    diasPorSemana: 2,
    horasSemanales: 7,
  },
  {
    id: 'lib-5',
    sede: 'Libertador',
    espacio: 'Patio Tarde',
    frecuencia: 'MJ',
    dias: ['MAR', 'JUE'],
    diasTexto: 'Mar, Jue',
    horario: '17:00 - 20:00',
    horaInicio: 1020,
    horaFin: 1200,
    horasPorDia: 3,
    diasPorSemana: 2,
    horasSemanales: 6,
  },

  // Buenas Nuevas
  {
    id: 'bn-1',
    sede: 'Buenas Nuevas',
    espacio: 'Campo Tarde',
    frecuencia: 'LMV',
    dias: ['LUN', 'MIE', 'VIE'],
    diasTexto: 'Lun, Mié, Vie',
    horario: '16:30 - 20:00',
    horaInicio: 990,
    horaFin: 1200,
    horasPorDia: 3.5,
    diasPorSemana: 3,
    horasSemanales: 10.5,
  },

  // Fátima
  {
    id: 'fat-1',
    sede: 'Fátima',
    espacio: 'Campo Tarde',
    frecuencia: 'LMV',
    dias: ['LUN', 'MIE', 'VIE'],
    diasTexto: 'Lun, Mié, Vie',
    horario: '16:30 - 20:00',
    horaInicio: 990,
    horaFin: 1200,
    horasPorDia: 3.5,
    diasPorSemana: 3,
    horasSemanales: 10.5,
  },
  {
    id: 'fat-2',
    sede: 'Fátima',
    espacio: 'Patio Tarde',
    frecuencia: 'MV',
    dias: ['MAR', 'VIE'],
    diasTexto: 'Mar, Vie',
    horario: '16:30 - 20:00',
    horaInicio: 990,
    horaFin: 1200,
    horasPorDia: 3.5,
    diasPorSemana: 2,
    horasSemanales: 7,
  },
];

export function detectarConflicto(turnoA: TurnoStaff, turnoB: TurnoStaff): ConflictInfo {
  // 1. Verificar si coinciden en al menos 1 día
  const diasComunes = turnoA.dias.filter((d) => turnoB.dias.includes(d));
  if (diasComunes.length === 0) {
    return { hasConflict: false };
  }

  // 2. Comprobar solapamiento de intervalos en minutos: [inicioA < finB] && [inicioB < finA]
  const seSolapan = turnoA.horaInicio < turnoB.horaFin && turnoB.horaInicio < turnoA.horaFin;
  if (!seSolapan) {
    return { hasConflict: false };
  }

  const nombresDiasMap: Record<string, string> = {
    LUN: 'Lun',
    MAR: 'Mar',
    MIE: 'Mié',
    JUE: 'Jue',
    VIE: 'Vie',
  };
  const diasTexto = diasComunes.map((d) => nombresDiasMap[d] || d).join(', ');

  const mismaSede = turnoA.sede === turnoB.sede;
  const motivoTexto = mismaSede
    ? `No puedes estar en ${turnoB.espacio} y ${turnoA.espacio} a la vez (${turnoB.horario}, ${diasTexto})`
    : `Choca con ${turnoB.sede} [${turnoB.espacio}] (${turnoB.horario}, ${diasTexto})`;

  return {
    hasConflict: true,
    chocaConSede: turnoB.sede,
    motivo: motivoTexto,
  };
}

export function verificarConflictoConSeleccionados(
  turno: TurnoStaff,
  seleccionados: TurnoStaff[]
): ConflictInfo {
  for (const sel of seleccionados) {
    if (sel.id === turno.id) continue;
    const res = detectarConflicto(turno, sel);
    if (res.hasConflict) {
      return res;
    }
  }
  return { hasConflict: false };
}

export function calcularTotales(turnos: TurnoStaff[]): { totalHoras: number; totalTurnos: number } {
  const totalHoras = turnos.reduce((sum, t) => sum + t.horasSemanales, 0);
  return {
    totalHoras: Math.round(totalHoras * 10) / 10,
    totalTurnos: turnos.length,
  };
}

export function generarMensajeWhatsApp(candidato: CandidatoStaff): string {
  const estrellas = '⭐'.repeat(candidato.calificacion || 5);
  const turnosDetalle = candidato.turnos
    .map(
      (t, idx) =>
        `  ${idx + 1}. *${t.sede}* - ${t.espacio}\n     🗓️ ${t.diasTexto} | ⏰ ${t.horario} (${t.horasSemanales} hrs/sem)`
    )
    .join('\n');

  return `🏆 *CLUB CAMPEONES LIMA - FICHA DE POSTULANTE* 🏆\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Nombre:* ${candidato.nombre}\n` +
    `📱 *WhatsApp:* ${candidato.telefono || 'No especificado'}\n` +
    `📍 *Distrito:* ${candidato.distrito || 'No especificado'}\n` +
    `🎂 *Edad:* ${candidato.edad || '17+'} años\n` +
    `🌟 *Calificación:* ${estrellas} (${candidato.calificacion || 5}/5)\n` +
    `📅 *Fecha Entrevista:* ${candidato.fecha}\n\n` +
    `⏱️ *DISPONIBILIDAD ASIGNADA:*\n` +
    `📊 *Total Turnos:* ${candidato.totalTurnos}\n` +
    `⚡ *Horas Semanales:* ${candidato.totalHoras} hrs\n\n` +
    `📌 *Detalle de Horarios:*\n` +
    `${turnosDetalle || '  (Sin turnos seleccionados)'}\n\n` +
    `📝 *Notas del Entrevistador:*\n` +
    `${candidato.notas ? `"${candidato.notas}"` : 'Sin observaciones adicionales'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Academia Deportiva Campeones Lima - Staff 2026_`;
}

export function generarCSV(candidatos: CandidatoStaff[]): string {
  const headers = [
    'ID',
    'Fecha Entrevista',
    'Nombre',
    'Telefono',
    'Distrito',
    'Edad',
    'Calificacion',
    'Total Horas Semanales',
    'Total Turnos',
    'Detalle de Turnos',
    'Notas',
  ];

  const filas = candidatos.map((c) => {
    const turnosStr = c.turnos
      .map((t) => `${t.sede} (${t.espacio} ${t.frecuencia} ${t.horario})`)
      .join('; ');

    return [
      `"${c.id}"`,
      `"${c.fecha}"`,
      `"${c.nombre.replace(/"/g, '""')}"`,
      `"${c.telefono}"`,
      `"${c.distrito.replace(/"/g, '""')}"`,
      `"${c.edad}"`,
      `"${c.calificacion}"`,
      `"${c.totalHoras}"`,
      `"${c.totalTurnos}"`,
      `"${turnosStr.replace(/"/g, '""')}"`,
      `"${c.notas.replace(/"/g, '""')}"`,
    ].join(',');
  });

  return '\uFEFF' + [headers.join(','), ...filas].join('\r\n');
}
