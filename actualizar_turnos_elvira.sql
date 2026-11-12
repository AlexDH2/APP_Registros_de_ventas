-- ==============================================================================
-- ACTUALIZACIÓN TURNOS ELVIRA GARCÍA Y GARCÍA (2 DE VÓLEY Y 2 DE BÁSQUET)
-- ==============================================================================

DELETE FROM public.turnos_staff 
WHERE id IN ('eg-1', 'eg-2') OR sede = 'Elvira García y García';

INSERT INTO public.turnos_staff (
  id, sede, espacio, frecuencia, dias, dias_texto, horario, hora_inicio, hora_fin, horas_por_dia, dias_por_semana, horas_semanales, orden
) VALUES
  ('eg-v1', 'Elvira García y García', 'Vóley (Campo Tarde)', 'LMV', '["LUN", "MIE", "VIE"]'::jsonb, 'Lun, Mié, Vie', '18:15 - 21:15', 1095, 1275, 3.0, 3, 9.0, 14),
  ('eg-v2', 'Elvira García y García', 'Vóley (Campo Tarde)', 'MJ', '["MAR", "JUE"]'::jsonb, 'Mar, Jue', '18:15 - 21:15', 1095, 1275, 3.0, 2, 6.0, 15),
  ('eg-b1', 'Elvira García y García', 'Básquet (Campo Tarde)', 'LMV', '["LUN", "MIE", "VIE"]'::jsonb, 'Lun, Mié, Vie', '18:15 - 21:15', 1095, 1275, 3.0, 3, 9.0, 16),
  ('eg-b2', 'Elvira García y García', 'Básquet (Campo Tarde)', 'MJ', '["MAR", "JUE"]'::jsonb, 'Mar, Jue', '18:15 - 21:15', 1095, 1275, 3.0, 2, 6.0, 17)
ON CONFLICT (id) DO UPDATE SET
  sede = EXCLUDED.sede,
  espacio = EXCLUDED.espacio,
  frecuencia = EXCLUDED.frecuencia,
  dias = EXCLUDED.dias,
  dias_texto = EXCLUDED.dias_texto,
  horario = EXCLUDED.horario,
  hora_inicio = EXCLUDED.hora_inicio,
  hora_fin = EXCLUDED.hora_fin,
  horas_por_dia = EXCLUDED.horas_por_dia,
  dias_por_semana = EXCLUDED.dias_por_semana,
  horas_semanales = EXCLUDED.horas_semanales,
  orden = EXCLUDED.orden;
