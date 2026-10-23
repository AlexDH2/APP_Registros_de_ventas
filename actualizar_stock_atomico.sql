-- ==============================================================================
-- FUNCIÓN RPC ATÓMICA PARA DESCONTAR STOCK SIN CONDICIONES DE CARRERA
-- ==============================================================================
-- Ejecuta este script en el Editor SQL de tu panel Supabase.

CREATE OR REPLACE FUNCTION public.decrementar_stock_sede(
  p_sede_id INT,
  p_agua INT,
  p_gatorade INT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.inventario_bebidas
  SET 
    agua_cantidad = GREATEST(0, agua_cantidad - p_agua),
    gatorade_cantidad = GREATEST(0, gatorade_cantidad - p_gatorade)
  WHERE sede_id = p_sede_id;
END;
$$ LANGUAGE plpgsql;

-- Permitir ejecución a la aplicación
GRANT EXECUTE ON FUNCTION public.decrementar_stock_sede(INT, INT, INT) TO anon, authenticated;
