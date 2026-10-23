-- ==============================================================================
-- SCRIPT DE LIMPIEZA TOTAL / REINICIO DE BASE DE DATOS (FACTORY RESET)
-- ==============================================================================
-- Ejecuta este script en el Editor SQL de Supabase cuando quieras borrar todos los
-- registros de prueba, transacciones, historiales y dejar las tablas vacías en cero.
-- ==============================================================================

-- 1. VACIAR TODAS LAS TRANSACCIONES Y OPERACIONES (Reinicio de IDs a 1)
TRUNCATE TABLE 
  public.ventas,
  public.anulaciones,
  public.entregas,
  public.pedidos_sede,
  public.mermas,
  public.transferencias_sedes,
  public.compras_proveedor,
  public.cajas,
  public.catalogo_productos
RESTART IDENTITY CASCADE;

-- 2. REINICIAR TODOS LOS INVENTARIOS A CERO (0)
UPDATE public.inventario_bebidas 
SET 
  agua_cantidad = 0, 
  gatorade_cantidad = 0;

-- Asegurar que cada sede tenga su registro de inventario inicializado en cero
INSERT INTO public.inventario_bebidas (sede_id, agua_cantidad, gatorade_cantidad)
SELECT id, 0, 0 FROM public.sedes
ON CONFLICT (sede_id) DO UPDATE
SET agua_cantidad = 0, gatorade_cantidad = 0;

UPDATE public.almacen_central 
SET 
  agua_stock = 0, 
  gatorade_stock = 0,
  ultima_actualizacion = now();

-- 3. REINICIAR CUENTAS DE USUARIOS (Dejar solo al Creador Principal)
-- Se eliminan todos los auxiliares y gestores de prueba creados
TRUNCATE TABLE public.usuario_sedes RESTART IDENTITY CASCADE;

DELETE FROM public.usuarios 
WHERE username != 'admin';

-- Asegurar que la cuenta 'admin' esté activa como CREADOR
INSERT INTO public.usuarios (username, password, nombre_completo, rol)
VALUES ('admin', 'admin123', 'Administrador Principal', 'CREADOR')
ON CONFLICT (username) DO UPDATE 
SET rol = 'CREADOR', password = 'admin123';

-- 4. REINICIAR PRECIOS BASE POR DEFECTO (Agua S/ 2.00, Gatorade S/ 3.00)
INSERT INTO public.configuracion_precios (id, precio_agua, precio_gatorade)
VALUES (1, 2.00, 3.00)
ON CONFLICT (id) DO UPDATE 
SET precio_agua = 2.00, precio_gatorade = 3.00;

-- 5. FOTOS DEL STORAGE BUCKET 'comprobantes'
-- NOTA: Supabase bloquea el borrado directo por SQL (error 42501) para evitar archivos huérfanos en disco.
-- Si deseas vaciar las fotos de los comprobantes:
-- Ve en el menú lateral izquierdo de Supabase a: Storage -> comprobantes -> Seleccionar todo -> Delete.

-- ==============================================================================
-- ¡LISTO! Tu base de datos ha quedado completamente limpia en Cero (0),
-- lista para salir a producción con tu cuenta Creador 'admin' / 'admin123'.
-- ==============================================================================
