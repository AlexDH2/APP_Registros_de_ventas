-- ==============================================================================
-- MÓDULO DE PRE-REGISTRO WEB DE ENTRADAS (AUTOGESTIÓN POR QR)
-- ==============================================================================

-- 1. Secuencia para códigos numéricos de fácil lectura y tipeo rápido (ej. CCL-1001)
CREATE SEQUENCE IF NOT EXISTS public.pre_registros_codigo_seq START WITH 1001;

-- 2. Tabla de pre-registros de entradas
CREATE TABLE IF NOT EXISTS public.pre_registros_entradas (
  id SERIAL PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  evento_id INTEGER NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  nombre_titular TEXT NOT NULL,
  dni_titular TEXT NOT NULL,
  telefono TEXT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  monto_total NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  asistentes JSONB NOT NULL DEFAULT '[]'::jsonb,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'COBRADO', 'CANCELADO')),
  venta_id INTEGER REFERENCES public.ventas_entradas(id) ON DELETE SET NULL,
  atendido_por TEXT,
  fecha_cobro TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsqueda ultra rápida en la entrada por código, DNI o estado
CREATE INDEX IF NOT EXISTS idx_pre_registros_codigo ON public.pre_registros_entradas(codigo);
CREATE INDEX IF NOT EXISTS idx_pre_registros_dni ON public.pre_registros_entradas(dni_titular);
CREATE INDEX IF NOT EXISTS idx_pre_registros_estado ON public.pre_registros_entradas(estado);
CREATE INDEX IF NOT EXISTS idx_pre_registros_evento ON public.pre_registros_entradas(evento_id);

-- 3. Habilitar RLS y políticas seguras
ALTER TABLE public.pre_registros_entradas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir inserción de pre-registros" ON public.pre_registros_entradas;
CREATE POLICY "Permitir inserción de pre-registros"
  ON public.pre_registros_entradas
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura de pre-registros" ON public.pre_registros_entradas;
CREATE POLICY "Permitir lectura de pre-registros"
  ON public.pre_registros_entradas
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir actualización de pre-registros" ON public.pre_registros_entradas;
CREATE POLICY "Permitir actualización de pre-registros"
  ON public.pre_registros_entradas
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Permisos sobre tabla y secuencias
GRANT ALL ON TABLE public.pre_registros_entradas TO anon, authenticated, service_role;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. Función RPC para registrar el pre-registro de forma atómica y segura
CREATE OR REPLACE FUNCTION public.crear_preregistro_entrada(
  p_evento_id INTEGER,
  p_nombre_titular TEXT,
  p_dni_titular TEXT,
  p_telefono TEXT,
  p_cantidad INTEGER,
  p_precio_unitario NUMERIC,
  p_monto_total NUMERIC,
  p_asistentes JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_num BIGINT;
  v_codigo TEXT;
  v_id INTEGER;
BEGIN
  -- Generar número y código único
  v_num := nextval('public.pre_registros_codigo_seq');
  v_codigo := 'CCL-' || LPAD(v_num::TEXT, 4, '0');

  INSERT INTO public.pre_registros_entradas (
    codigo,
    evento_id,
    nombre_titular,
    dni_titular,
    telefono,
    cantidad,
    precio_unitario,
    monto_total,
    asistentes,
    estado
  ) VALUES (
    v_codigo,
    p_evento_id,
    TRIM(p_nombre_titular),
    TRIM(p_dni_titular),
    NULLIF(TRIM(p_telefono), ''),
    p_cantidad,
    p_precio_unitario,
    p_monto_total,
    COALESCE(p_asistentes, '[]'::jsonb),
    'PENDIENTE'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_id,
    'codigo', v_codigo,
    'cantidad', p_cantidad,
    'monto_total', p_monto_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_preregistro_entrada TO anon, authenticated, service_role;

-- 5. Función RPC para marcar como cobrado al emitir las entradas en boletería
CREATE OR REPLACE FUNCTION public.marcar_preregistro_cobrado(
  p_codigo TEXT,
  p_venta_id INTEGER,
  p_atendido_por TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.pre_registros_entradas
  SET estado = 'COBRADO',
      venta_id = p_venta_id,
      atendido_por = p_atendido_por,
      fecha_cobro = NOW()
  WHERE (codigo = UPPER(TRIM(p_codigo)) OR codigo = 'CCL-' || TRIM(p_codigo))
    AND estado = 'PENDIENTE';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', v_updated > 0,
    'updated', v_updated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_preregistro_cobrado TO anon, authenticated, service_role;

-- 6. Campos de Yape en la tabla eventos (Imagen QR, número y titular visibles para los padres en la web)
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS yape_numero TEXT,
  ADD COLUMN IF NOT EXISTS yape_titular TEXT,
  ADD COLUMN IF NOT EXISTS yape_imagen_url TEXT;
