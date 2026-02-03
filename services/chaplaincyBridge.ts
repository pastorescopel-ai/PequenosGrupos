
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
    console.log("Bridge: Preparando payload para Capelania:", data.pg_name);
    
    // Limpeza rigorosa do ID do capelão para evitar erro 400 (UUID inválido)
    // Se for uma string vazia ou não tiver formato de UUID, enviamos null
    const chaplainId = (data.preferred_chaplain_id && data.preferred_chaplain_id.length > 10) 
      ? data.preferred_chaplain_id 
      : null;

    const payload = {
      pg_name: data.pg_name,
      leader_name: data.leader_name,
      leader_phone: data.leader_phone || null,
      unit: data.unit,
      date: data.date, // ISO String
      request_notes: data.request_notes || null,
      preferred_chaplain_id: chaplainId,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    console.log("Bridge: Enviando Insert...", payload);

    const { error } = await chaplaincyClient
      .from('visit_requests')
      .insert(payload);

    if (error) {
      console.error("Erro na ponte Supabase (400?):", error.message, error.details, error.hint);
      return { success: false, error };
    }

    console.log("Sucesso: Convite registrado no Supabase da Capelania.");
    return { success: true };
  } catch (e) {
    console.error("Erro de conexão na ponte:", e);
    return { success: false, error: e };
  }
};
