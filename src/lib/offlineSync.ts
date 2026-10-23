import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

type OfflineSale = {
  id: string;
  sede_id: number;
  caja_id: number | null;
  fecha: string;
  metodo_pago: string;
  banco: string | null;
  agua_vendida: number;
  gatorade_vendida: number;
  monto: number;
  descripcion: string;
  vendedor: string;
  estado: string;
  imageUri: string | null; // Local file URI
};

export const saveOfflineSale = async (sale: Omit<OfflineSale, 'id'>) => {
  try {
    const queueJson = await AsyncStorage.getItem('offline_sales_queue');
    const queue: OfflineSale[] = queueJson ? JSON.parse(queueJson) : [];
    
    let localUri = null;
    if (sale.imageUri) {
      // Copy the image to a permanent document directory so it doesn't get wiped from cache
      const fileName = `offline_${Date.now()}.jpg`;
      localUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({
        from: sale.imageUri,
        to: localUri
      });
    }

    const newSale: OfflineSale = {
      ...sale,
      id: Date.now().toString(),
      imageUri: localUri
    };

    queue.push(newSale);
    await AsyncStorage.setItem('offline_sales_queue', JSON.stringify(queue));
    return true;
  } catch (error) {
    console.error('Error saving offline sale:', error);
    return false;
  }
};

export const getOfflineSales = async (): Promise<OfflineSale[]> => {
  try {
    const queueJson = await AsyncStorage.getItem('offline_sales_queue');
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (error) {
    return [];
  }
};

export const syncOfflineSales = async () => {
  const queue = await getOfflineSales();
  if (queue.length === 0) return 0;

  let syncedCount = 0;
  let remainingQueue = [...queue];

  for (const sale of queue) {
    try {
      let publicUrl = null;

      if (sale.imageUri) {
        // We need to read the file as base64 to upload
        const base64 = await FileSystem.readAsStringAsync(sale.imageUri, { encoding: FileSystem.EncodingType.Base64 });
        const filePath = `${sale.sede_id}/captura_offline_${sale.id}.jpg`;
        
        // Uint8Array conversion not available easily in standard RN without buffer, but supabase accepts base64 via decode in base64-arraybuffer
        // Wait, the caller (sale.tsx) used: `import { decode } from 'base64-arraybuffer'`
        // For here, we'll just require it or export a function to do it.
        // Let's use decode.
        const { decode } = require('base64-arraybuffer');
        
        const { error: uploadError } = await supabase.storage
          .from('comprobantes')
          .upload(filePath, decode(base64), { contentType: 'image/jpeg' });
          
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }

      // Insert sale
      const { error: insertError } = await supabase.from('ventas').insert([{
        sede_id: sale.sede_id,
        caja_id: sale.caja_id,
        fecha: sale.fecha,
        metodo_pago: sale.metodo_pago,
        banco: sale.banco,
        agua_vendida: sale.agua_vendida,
        gatorade_vendida: sale.gatorade_vendida,
        url_captura: publicUrl,
        monto: sale.monto,
        descripcion: sale.descripcion,
        vendedor: sale.vendedor,
        estado: sale.estado
      }]);
      
      if (insertError) throw insertError;

      // Update inventory (since offline sales bypassed it)
      if (sale.agua_vendida > 0 || sale.gatorade_vendida > 0) {
        const { data: inv } = await supabase.from('inventario_bebidas').select('*').eq('sede_id', sale.sede_id).single();
        if (inv) {
          await supabase.from('inventario_bebidas').update({
            agua_cantidad: inv.agua_cantidad - sale.agua_vendida,
            gatorade_cantidad: inv.gatorade_cantidad - sale.gatorade_vendida
          }).eq('id', inv.id);
        }
      }

      // Success! Remove from queue and delete local file
      remainingQueue = remainingQueue.filter(s => s.id !== sale.id);
      if (sale.imageUri) {
        await FileSystem.deleteAsync(sale.imageUri, { idempotent: true });
      }
      syncedCount++;

    } catch (e) {
      console.log('Error syncing sale', sale.id, e);
      // Stop syncing if we hit a network error to avoid spamming
      break; 
    }
  }

  // Save the updated queue
  await AsyncStorage.setItem('offline_sales_queue', JSON.stringify(remainingQueue));
  return syncedCount;
};
