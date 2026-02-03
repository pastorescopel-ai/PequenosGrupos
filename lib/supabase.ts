
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.48.1';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Cliente para uso no Frontend
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Função utilitária para upload de fotos de reuniões
 * Armazena no bucket 'pg-photos' organizado por ano/semana/lider
 */
export const uploadMeetingPhoto = async (file: File, leaderId: string, week: number, year: number) => {
  const filePath = `${year}/week-${week}/${leaderId}-${Date.now()}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('pg-photos')
    .upload(filePath, file);

  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('pg-photos')
    .getPublicUrl(data.path);
    
  return publicUrl;
};
