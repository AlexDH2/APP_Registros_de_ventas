-- ==============================================================================
-- SCRIPT SQL VENTA DE ENTRADAS PARA EVENTOS (ALTA CONCURRENCIA PARA 5 COLABORADORES)
-- ==============================================================================
-- Compatible con Supabase PostgreSQL 17.
-- Bloqueo exclusivo de fila 'FOR UPDATE' que garantiza CERO colisiones o duplicados.
-- Incluye SECURITY DEFINER y permisos de secuencias para evitar errores de permisos.
-- ==============================================================================

-- 1. TABLA DE EVENTOS (PRECIO ÚNICO POR ENTRADA Y CONTROL DE CORRELATIVOS)
CREATE TABLE IF NOT EXISTS public.eventos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT 'Gran Evento Deportivo 2026',
  lugar TEXT DEFAULT 'Complejo Deportivo',
  precio_entrada NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
  aforo_maximo INTEGER DEFAULT NULL, -- NULL = sin límite
  ultimo_ticket_emitido INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'FINALIZADO', 'PAUSADO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columnas si ya existía la tabla
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS precio_entrada NUMERIC(10, 2) NOT NULL DEFAULT 10.00;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS aforo_maximo INTEGER DEFAULT NULL;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS ultimo_ticket_emitido INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'ACTIVO';

-- Insertar evento inicial si está vacía
INSERT INTO public.eventos (nombre, lugar, precio_entrada, aforo_maximo, estado)
SELECT 'Gran Evento Deportivo 2026', 'Sede Principal', 10.00, 1000, 'ACTIVO'
WHERE NOT EXISTS (SELECT 1 FROM public.eventos WHERE estado = 'ACTIVO');

-- 2. TABLA DE VENTAS DE ENTRADAS (CON NOMBRE, DNI, ASISTENTES Y COMPROBANTE)
CREATE TABLE IF NOT EXISTS public.ventas_entradas (
  id SERIAL PRIMARY KEY,
  evento_id INTEGER REFERENCES public.eventos(id) ON DELETE CASCADE,
  numero_ticket_inicio INTEGER NOT NULL,
  numero_ticket_fin INTEGER NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
  monto_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  metodo_pago TEXT NOT NULL DEFAULT 'Efectivo', -- 'Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia'
  monto_recibido NUMERIC(10, 2),
  vuelto NUMERIC(10, 2) DEFAULT 0.00,
  nombre_completo TEXT,
  dni TEXT,
  asistentes JSONB DEFAULT '[]'::jsonb,
  url_comprobante TEXT,
  colaborador_id INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  colaborador_nombre TEXT NOT NULL DEFAULT 'Colaborador',
  notas TEXT,
  estado TEXT NOT NULL DEFAULT 'COMPLETADA' CHECK (estado IN ('COMPLETADA', 'ANULADA')),
  motivo_anulacion TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columna asistentes si ya existía la tabla
ALTER TABLE public.ventas_entradas ADD COLUMN IF NOT EXISTS asistentes JSONB DEFAULT '[]'::jsonb;

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_ventas_entradas_evento ON public.ventas_entradas(evento_id);
CREATE INDEX IF NOT EXISTS idx_ventas_entradas_colaborador ON public.ventas_entradas(colaborador_nombre);
CREATE INDEX IF NOT EXISTS idx_ventas_entradas_dni ON public.ventas_entradas(dni);
CREATE INDEX IF NOT EXISTS idx_ventas_entradas_fecha ON public.ventas_entradas(fecha DESC);

-- 3. FUNCIÓN ATÓMICA DE EMISIÓN DE ENTRADAS (100% THREAD-SAFE CON BLOQUEO FOR UPDATE Y SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.emitir_entradas_atomica(
  p_evento_id INT,
  p_cantidad INT,
  p_precio_unitario NUMERIC,
  p_monto_total NUMERIC,
  p_metodo_pago TEXT,
  p_monto_recibido NUMERIC,
  p_vuelto NUMERIC,
  p_nombre_completo TEXT,
  p_dni TEXT,
  p_url_comprobante TEXT,
  p_colaborador_id INT,
  p_colaborador_nombre TEXT,
  p_notas TEXT,
  p_asistentes JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ultimo_ticket INT;
  v_ticket_inicio INT;
  v_ticket_fin INT;
  v_venta_id INT;
  v_aforo_max INT;
  v_total_vendidas INT;
  v_resultado JSONB;
BEGIN
  IF p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad de entradas debe ser mayor a cero.';
  END IF;

  -- BLOQUEO EXCLUSIVO DE FILA: Serializa transacciones concurrentes de los 5 colaboradores
  SELECT aforo_maximo, COALESCE(ultimo_ticket_emitido, 0)
  INTO v_aforo_max, v_ultimo_ticket
  FROM public.eventos
  WHERE id = p_evento_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El evento especificado no existe o no está disponible.';
  END IF;

  -- Validar aforo en tiempo real con datos estrictamente consistentes
  IF v_aforo_max IS NOT NULL THEN
    SELECT COALESCE(SUM(cantidad), 0) INTO v_total_vendidas
    FROM public.ventas_entradas
    WHERE evento_id = p_evento_id AND estado = 'COMPLETADA';

    IF (v_total_vendidas + p_cantidad) > v_aforo_max THEN
      RAISE EXCEPTION 'Aforo alcanzado. Quedan solo % entradas disponibles.', 
        GREATEST(0, v_aforo_max - v_total_vendidas);
    END IF;
  END IF;

  -- Asignación matemática de correlativos sin posibilidad de colisión
  v_ticket_inicio := v_ultimo_ticket + 1;
  v_ticket_fin := v_ultimo_ticket + p_cantidad;

  -- Actualizar el contador del evento
  UPDATE public.eventos 
  SET ultimo_ticket_emitido = v_ticket_fin 
  WHERE id = p_evento_id;

  -- Insertar venta con asistentes
  INSERT INTO public.ventas_entradas (
    evento_id,
    numero_ticket_inicio,
    numero_ticket_fin,
    cantidad,
    precio_unitario,
    monto_total,
    metodo_pago,
    monto_recibido,
    vuelto,
    nombre_completo,
    dni,
    asistentes,
    url_comprobante,
    colaborador_id,
    colaborador_nombre,
    notas,
    estado,
    fecha
  ) VALUES (
    p_evento_id,
    v_ticket_inicio,
    v_ticket_fin,
    p_cantidad,
    p_precio_unitario,
    p_monto_total,
    p_metodo_pago,
    p_monto_recibido,
    p_vuelto,
    p_nombre_completo,
    p_dni,
    p_asistentes,
    p_url_comprobante,
    p_colaborador_id,
    p_colaborador_nombre,
    p_notas,
    'COMPLETADA',
    timezone('utc'::text, now())
  ) RETURNING id INTO v_venta_id;

  v_resultado := jsonb_build_object(
    'success', true,
    'venta_id', v_venta_id,
    'ticket_inicio', v_ticket_inicio,
    'ticket_fin', v_ticket_fin,
    'cantidad', p_cantidad,
    'monto_total', p_monto_total,
    'metodo_pago', p_metodo_pago,
    'vuelto', p_vuelto,
    'colaborador_nombre', p_colaborador_nombre,
    'nombre_completo', p_nombre_completo,
    'dni', p_dni
  );

  RETURN v_resultado;
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.emitir_entradas_atomica TO anon, authenticated, service_role;

-- 4. POLÍTICAS RLS Y PERMISOS DE TABLAS Y SECUENCIAS
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_entradas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permitir_todo_eventos" ON public.eventos;
CREATE POLICY "permitir_todo_eventos" ON public.eventos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "permitir_todo_ventas_entradas" ON public.ventas_entradas;
CREATE POLICY "permitir_todo_ventas_entradas" ON public.ventas_entradas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.eventos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ventas_entradas TO anon, authenticated, service_role;

-- Concesión vital de permisos a las secuencias para que los roles anónimo y autenticado
-- puedan autoincrementar IDs sin error de "permission denied for sequence"
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO anon, authenticated, service_role;
