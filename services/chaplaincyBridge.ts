
import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURAÇÃO DA PONTE COM CAPELANIA
 * Este serviço conecta o App de PGs ao banco de dados do App de Capelania.
 */

const CHAPLAINCY_URL = "https://qksbywkshuznbuyzwljx.supabase.co";
const CHAPLAINCY_KEY = "sb_publishable_44GfukXRPHT92-DXRpEmSg_0CTgXA09";

export const chaplaincyClient = createClient(CHAPLAINCY_URL, CHAPLAINCY_KEY);

export interface VisitRequestPayload {
  pg_name: string;
  leader_name: string;
  leader_phone?: string;
  unit: 'HAB' | 'HABA';
  date: string; 
  request_notes?: string;
  preferred_chaplain_id?: string;
}

/**
 * Envia uma notificação/convite para o App de Capelania (tabela visit_requests)
 */
export const notifyChaplaincyOfNewInvite = async (data: VisitRequestPayload) => {
  try {
    console.log("Bridge: Enviando convite para Capelania:", data.pg_name);
    
    const { error } = await chaplaincyClient
      .from('visit_requests')
      .insert({
        pg_name: data.pg_name,
        leader_name: data.leader_name,
        leader_phone: data.leader_phone,
        unit: data.unit,
        date: data.date,
        request_notes: data.request_notes,
        preferred_chaplain_id: data.preferred_chaplain_id || null,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error("Erro na ponte Supabase:", error);
      return { success: false, error };
    }

    console.log("Sucesso: Convite registrado no Supabase da Capelania.");
    return { success: true };
  } catch (e) {
    console.error("Erro de conexão na ponte:", e);
    return { success: false, error: e };
  }
};
