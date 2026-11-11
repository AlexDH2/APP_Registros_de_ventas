-- ==============================================================================
-- FIX URGENTE: SOLUCIÓN AL ERROR "permission denied for sequence ventas_entradas_id_seq"
-- ==============================================================================

-- 1. Asegurar columna asistentes en la tabla ventas_entradas
ALTER TABLE public.ventas_entradas 
ADD COLUMN IF NOT EXISTS asistentes JSONB DEFAULT '[]'::jsonb;

-- 2. Conceder permisos de uso y actualización a las secuencias de PostgreSQL
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO anon, authenticated, service_role;

-- Permisos explícitos a secuencias
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'ventas_entradas_id_seq') THEN
    GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.ventas_entradas_id_seq TO anon, authenticated, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'eventos_id_seq') THEN
    GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.eventos_id_seq TO anon, authenticated, service_role;
  END IF;
END $$;

-- 3. Eliminar versiones anteriores sobrecargadas para evitar ambigüedad
DROP FUNCTION IF EXISTS public.emitir_entradas_atomica(integer, integer, numeric, numeric, text, numeric, numeric, text, text, text, integer, text, text);
DROP FUNCTION IF EXISTS public.emitir_entradas_atomica(integer, integer, numeric, numeric, text, numeric, numeric, text, text, text, integer, text, text, jsonb);

-- 4. Crear la función atómica de emisión con SECURITY DEFINER
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

  -- BLOQUEO EXCLUSIVO DE FILA: Serializa transacciones concurrentes de los colaboradores
  SELECT aforo_maximo, COALESCE(ultimo_ticket_emitido, 0)
  INTO v_aforo_max, v_ultimo_ticket
  FROM public.eventos
  WHERE id = p_evento_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El evento especificado no existe o no está disponible.';
  END IF;

  -- Validar aforo en tiempo real
  IF v_aforo_max IS NOT NULL THEN
    SELECT COALESCE(SUM(cantidad), 0) INTO v_total_vendidas
    FROM public.ventas_entradas
    WHERE evento_id = p_evento_id AND estado = 'COMPLETADA';

    IF (v_total_vendidas + p_cantidad) > v_aforo_max THEN
      RAISE EXCEPTION 'Aforo alcanzado. Quedan solo % entradas disponibles.', 
        GREATEST(0, v_aforo_max - v_total_vendidas);
    END IF;
  END IF;

  -- Asignación matemática de correlativos
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

-- 5. Otorgar permisos de ejecución sobre la función única
GRANT EXECUTE ON FUNCTION public.emitir_entradas_atomica(
  INT, INT, NUMERIC, NUMERIC, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, INT, TEXT, TEXT, JSONB
) TO anon, authenticated, service_role;

-- 6. Asegurar permisos de tablas y RLS
GRANT ALL ON TABLE public.eventos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ventas_entradas TO anon, authenticated, service_role;
