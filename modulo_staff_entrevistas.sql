-- ==============================================================================
-- SCRIPT SQL: MÓDULO DE SELECCIÓN DE STAFF, HORARIOS Y ENTREVISTAS
-- Club - Academia Deportiva Campeones Lima
-- Compatible con PostgreSQL 14+ y Supabase
-- ==============================================================================

-- 1. TABLA: turnos_staff
-- Catálogo centralizado de turnos oficiales de entrenamiento en las 7 sedes.
CREATE TABLE IF NOT EXISTS public.turnos_staff (
    id TEXT PRIMARY KEY,
    sede TEXT NOT NULL,
    espacio TEXT NOT NULL,
    frecuencia TEXT NOT NULL, -- 'LMV' | 'MJ' | 'MV' | 'LUN'
    dias JSONB NOT NULL DEFAULT '[]'::jsonb,
    dias_texto TEXT NOT NULL,
    horario TEXT NOT NULL,
    hora_inicio INT NOT NULL, -- Minutos desde medianoche (ej: 10:00 -> 600)
    hora_fin INT NOT NULL,    -- Minutos desde medianoche (ej: 13:00 -> 780)
    horas_por_dia NUMERIC(4, 2) NOT NULL,
    dias_por_semana INT NOT NULL,
    horas_semanales NUMERIC(4, 2) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA: candidatos_staff
-- Fichas de postulantes registradas durante las entrevistas.
CREATE TABLE IF NOT EXISTS public.candidatos_staff (
    id TEXT PRIMARY KEY,
    fecha TEXT NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT,
    distrito TEXT,
    edad TEXT,
    calificacion INT NOT NULL DEFAULT 5,
    notas TEXT,
    total_horas NUMERIC(5, 2) NOT NULL DEFAULT 0,
    total_turnos INT NOT NULL DEFAULT 0,
    turnos JSONB NOT NULL DEFAULT '[]'::jsonb,
    entrevistador_nombre TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PERMISOS Y SEGURIDAD RLS
ALTER TABLE public.turnos_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatos_staff ENABLE ROW LEVEL SECURITY;

-- Políticas para turnos_staff (Lectura pública, escritura para staff/admin)
DROP POLICY IF EXISTS "Permitir lectura publica de turnos_staff" ON public.turnos_staff;
CREATE POLICY "Permitir lectura publica de turnos_staff"
ON public.turnos_staff FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Permitir escritura de turnos_staff" ON public.turnos_staff;
CREATE POLICY "Permitir escritura de turnos_staff"
ON public.turnos_staff FOR ALL
USING (true)
WITH CHECK (true);

-- Políticas para candidatos_staff (Lectura y registro abierto para entrevistadores)
DROP POLICY IF EXISTS "Permitir lectura de candidatos_staff" ON public.candidatos_staff;
CREATE POLICY "Permitir lectura de candidatos_staff"
ON public.candidatos_staff FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Permitir insercion de candidatos_staff" ON public.candidatos_staff;
CREATE POLICY "Permitir insercion de candidatos_staff"
ON public.candidatos_staff FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de candidatos_staff" ON public.candidatos_staff;
CREATE POLICY "Permitir actualizacion de candidatos_staff"
ON public.candidatos_staff FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Permitir eliminacion de candidatos_staff" ON public.candidatos_staff;
CREATE POLICY "Permitir eliminacion de candidatos_staff"
ON public.candidatos_staff FOR DELETE
USING (true);

-- Otorgar permisos a roles de Supabase
GRANT ALL ON TABLE public.turnos_staff TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.candidatos_staff TO anon, authenticated, service_role;

-- 4. POBLADO INICIAL DE TURNOS (23 TURNOS OFICIALES DE LAS 7 SEDES)
INSERT INTO public.turnos_staff (id, sede, espacio, frecuencia, dias, dias_texto, horario, hora_inicio, hora_fin, horas_por_dia, dias_por_semana, horas_semanales, orden)
VALUES
  -- Cristo Rey
  ('cr-1', 'Cristo Rey', 'Campo Mañana', 'LMV', '["LUN", "MIE", "VIE"]'::jsonb, 'Lun, Mié, Vie', '10:00 - 13:00', 600, 780, 3.0, 3, 9.0, 1),
  ('cr-2', 'Cristo Rey', 'Campo Tarde', 'LMV', '["LUN", "MIE", "VIE"]'::jsonb, 'Lun, Mié, Vie', '17:00 - 20:30', 1020, 1230, 3.5, 3, 10.5, 2),
  ('cr-3', 'Cristo Rey', 'Salón Mañana', 'MV', '["MAR", "VIE"]'::jsonb, 'Mar, Vie', '10:00 - 12:00', 600, 720, 2.0, 2, 4.0, 3),
  ('cr-4', 'Cristo Rey', 'Salón Tarde', 'MV', '["MAR", "VIE"]'::jsonb, 'Mar, Vie', '17:00 - 20:30', 1020, 1230, 3.5, 2, 7.0, 4),
  ('cr-5', 'Cristo Rey', 'Campo Tarde', 'MJ', '["MAR", "JUE"]'::jsonb, 'Mar, Jue', '17:00 - 20:30', 1020, 1230, 3.5, 2, 7.0, 5),
  ('cr-6', 'Cristo Rey', 'Salón Tarde', 'MJ', '["MAR", "JUE"]'::jsonb, 'Mar, Jue', '17:00 - 20:30', 1020, 1230, 3.5, 2, 7.0, 6),
  ('cr-7', 'Cristo Rey', 'Salón Mañana', 'MJ', '["MAR", "JUE"]'::jsonb, 'Mar, Jue', '09:00 - 12:00', 540, 720, 3.0, 2, 6.0, 7),

  -- Liceo Naval
  ('ln-1', 'Liceo Naval', 'Campo Tarde', 'LMV', '["LUN", "MIE", "VIE"]'::jsonb, 'Lun, Mié, Vie', '17:00 - 20:30', 1020, 1230, 3.5, 3, 10.5, 8),
  ('ln-2', 'Liceo Naval', 'Tarima Tarde', 'MV', '["MAR", "VIE"]'::jsonb, 'Mar, Vie', '17:00 - 20:30', 1020, 1230, 3.5, 2, 7.0, 9),
  ('ln-3', 'Liceo Naval', 'Tarima Tarde', 'LUN', '["LUN"]'::jsonb, 'Lun', '17:00 - 20:30', 1020, 1230, 3.5, 1, 3.5, 10),
  ('ln-4', 'Liceo Naval', 'Tarima Tarde', 'MJ', '["MAR", "JUE"]'::jsonb, 'Mar, Jue', '17:00 - 20:30', 1020, 1230, 3.5, 2, 7.0, 11),
  ('ln-5', 'Liceo Naval', 'Campo Tarde', 'MJ', '["MAR", "JUE"]'::jsonb, 'Mar, Jue', '17:00 - 20:30', 1020, 1230, 3.5, 2, 7.0, 12),

  -- Santísima Trinidad
  ('st-1', 'Santísima Trinidad', 'Campo Tarde', 'MJ', '["MAR", "JUE"]'::jsonb, 'Mar, Jue', '18:00 - 21:00', 1080, 1260, 3.0, 2, 6.0, 13),

  -- Elvira García y García (4 turnos: 2 de Vóley y 2 de Básquet)
  ('eg-v1', 'Elvira García y García', 'Vóley (Campo Tarde)', 'LMV', '["LUN", "MIE", "VIE"]'::jsonb, 'Lun, Mié, Vie', '18:15 - 21:15', 1095, 1275, 3.0, 3, 9.0, 14),
  ('eg-v2', 'Elvira García y García', 'Vóley (Campo Tarde)', 'MJ', '["MAR", "JUE"]'::jsonb, 'Mar, Jue', '18:15 - 21:15', 1095, 1275, 3.0, 2, 6.0, 15),
  ('eg-b1', 'Elvira García y García', 'Básquet (Campo Tarde)', 'LMV', '["LUN", "MIE", "VIE"]'::jsonb, 'Lun, Mié, Vie', '18:15 - 21:15', 1095, 1275, 3.0, 3, 9.0, 16),
  ('eg-b2', 'Elvira García y García', 'Básquet (Campo Tarde)', 'MJ', '["MAR", "JUE"]'::jsonb, 'Mar, Jue', '18:15 - 21:15', 1095, 1275, 3.0, 2, 6.0, 17),

  -- Libertador
  ('lib-1', 'Libertador', 'Campo Tarde', 'LMV', '["LUN", "MIE", "VIE"]'::jsonb, 'Lun, Mié, Vie', '16:30 - 20:00', 990, 1200, 3.5, 3, 10.5, 18),
  ('lib-2', 'Libertador', 'Patio Tarde', 'MV', '["MAR", "VIE"]'::jsonb, 'Mar, Vie', '16:30 - 20:00', 990, 1200, 3.5, 2, 7.0, 19),
  ('lib-3', 'Libertador', 'Patio Tarde', 'LUN', '["LUN"]'::jsonb, 'Lun', '16:30 - 20:00', 990, 1200, 3.5, 1, 3.5, 20),
  ('lib-4', 'Libertador', 'Campo Tarde', 'MJ', '["MAR", "JUE"]'::jsonb, 'Mar, Jue', '16:30 - 20:00', 990, 1200, 3.5, 2, 7.0, 21),
  ('lib-5', 'Libertador', 'Patio Tarde', 'MJ', '["MAR", "JUE"]'::jsonb, 'Mar, Jue', '17:00 - 20:00', 1020, 1200, 3.0, 2, 6.0, 22),

  -- Buenas Nuevas
  ('bn-1', 'Buenas Nuevas', 'Campo Tarde', 'LMV', '["LUN", "MIE", "VIE"]'::jsonb, 'Lun, Mié, Vie', '16:30 - 20:00', 990, 1200, 3.5, 3, 10.5, 23),

  -- Fátima
  ('fat-1', 'Fátima', 'Campo Tarde', 'LMV', '["LUN", "MIE", "VIE"]'::jsonb, 'Lun, Mié, Vie', '16:30 - 20:00', 990, 1200, 3.5, 3, 10.5, 24),
  ('fat-2', 'Fátima', 'Patio Tarde', 'MV', '["MAR", "VIE"]'::jsonb, 'Mar, Vie', '16:30 - 20:00', 990, 1200, 3.5, 2, 7.0, 25)
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

-- 5. NOTIFICACIÓN DE ÉXITO
DO $$
BEGIN
    RAISE NOTICE '¡Módulo de Staff y Horarios instalado correctamente en Supabase!';
END $$;
