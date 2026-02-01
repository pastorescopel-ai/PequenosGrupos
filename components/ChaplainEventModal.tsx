
import React from 'react';
import { X, User, Users, Phone, MapPin, Clock, MessageSquare, Share2 } from 'lucide-react';
import { MeetingSchedule, Chaplain } from '../types';

interface ChaplainEventModalProps {
  meeting: MeetingSchedule;
  chaplains: Chaplain[];
  onClose: () => void;
}

const ChaplainEventModal: React.FC<ChaplainEventModalProps> = ({ meeting, chaplains, onClose }) => {
  const openWhatsAppLeader = (whatsapp: string) => {
    const cleanNumber = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanNumber}`, '_blank');
  };

  const sendWhatsAppToChaplain = () => {
    const chaplain = chaplains.find(c => c.id === meeting.assigned_chaplain_id);
    const dateFormatted = new Date(meeting.full_date).toLocaleString('pt-BR');
    const text = `*Escala Pastoral - Confirmação*%0A%0AOlá Pr. ${chaplain?.name || 'Capelão'}, você foi escalado para uma visita:%0A%0A📍 *PG:* ${meeting.pg_name}%0A🏥 *Setor:* ${meeting.sector_name}%0A🗓️ *Data:* ${dateFormatted}%0A👤 *Líder:* ${meeting.leader_name}%0A📞 *WhatsApp do Líder:* ${meeting.leader_whatsapp || 'Não informado'}%0A%0A_Favor confirmar o recebimento._`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-blue-950/95 backdrop-blur-xl z-[500] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-12 shadow-2xl animate-in zoom-in-95 duration-300 relative" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-10">
          <div>
            <h4 className="text-3xl font-black text-slate-800 tracking-tight">Detalhes do Convite</h4>
            <p className="text-blue-600 text-xs font-black uppercase tracking-widest mt-1">Status: Agenda Pastoral Confirmada</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all"><X size={24}/></button>
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-6 p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-50">
              <User size={32} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Capelão Escalado</p>
              <p className="text-xl font-black text-blue-900 leading-tight">{meeting.chaplain_assigned_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm"><Users size={20}/></div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pequeno Grupo / Líder</p>
                <p className="text-base font-black text-slate-800">{meeting.pg_name}</p>
                <p className="text-sm font-medium text-slate-500">Responsável: {meeting.leader_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="p-3 bg-white rounded-xl text-green-600 shadow-sm"><Phone size={20}/></div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número do Líder (Visualização)</p>
                <p className="text-lg font-black text-slate-800 tracking-widest">{meeting.leader_whatsapp || 'Não informado'}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm"><MapPin size={20}/></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor / Hospital</p>
                <p className="text-base font-black text-slate-800">{meeting.sector_name}</p>
                <p className="text-sm font-medium text-slate-500">{meeting.hospital}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm"><Clock size={20}/></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data e Horário</p>
                <p className="text-base font-black text-slate-800">{new Date(meeting.full_date).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {meeting.request_notes && (
            <div className="p-6 bg-orange-50 rounded-[2rem] border border-orange-100">
              <p className="text-[10px] font-black text-orange-600 uppercase mb-2">Motivo do Convite:</p>
              <p className="italic text-orange-900 text-sm font-medium">"{meeting.request_notes}"</p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => meeting.leader_whatsapp && openWhatsAppLeader(meeting.leader_whatsapp)}
              className="flex-1 py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-green-100 flex items-center justify-center gap-3 hover:bg-green-700 transition-all active:scale-95"
            >
              <MessageSquare size={16}/> Chamar Líder
            </button>
            <button 
              onClick={sendWhatsAppToChaplain}
              className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100 flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Share2 size={16}/> Enviar ao Pastor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChaplainEventModal;
