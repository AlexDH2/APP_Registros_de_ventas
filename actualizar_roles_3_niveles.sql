-- ==============================================================================
-- ACTUALIZACIÓN INTEGRAL: ROLES EN 3 NIVELES + DESCUENTO ATÓMICO DE STOCK
-- ==============================================================================
-- Ejecuta este script en el Editor SQL de tu panel Supabase.

-- 1. Actualizar la restricción CHECK en la tabla usuarios para admitir los nuevos roles
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check 
  CHECK (rol IN ('CREADOR', 'ADMIN', 'LOGISTICA', 'AUXILIAR', 'VENDEDOR'));

-- 2. Asegurarse de que el usuario 'admin' tenga el rol 'CREADOR'
UPDATE public.usuarios 
SET rol = 'CREADOR' 
WHERE username = 'admin';

-- 3. Si tienes usuarios previos con rol 'VENDEDOR', actualizarlos a 'AUXILIAR'
UPDATE public.usuarios 
SET rol = 'AUXILIAR' 
WHERE rol = 'VENDEDOR';

-- 4. Función atómica para descontar inventario en sedes sin condiciones de carrera
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

GRANT EXECUTE ON FUNCTION public.decrementar_stock_sede(INT, INT, INT) TO anon, authenticated;
