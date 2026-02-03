
import React, { useState } from 'react';
import { 
  CalendarCheck, Clock, Share2, FileText, ExternalLink, User, Phone, MessageSquare
} from 'lucide-react';
import { MeetingSchedule, Chaplain } from '../types';
import ChaplainEventModal from './ChaplainEventModal';
import ChaplainAssignModal from './ChaplainAssignModal';
import ChaplainDeclineModal from './ChaplainDeclineModal';

interface ChaplainScaleProps {
  meetingSchedules: MeetingSchedule[];
  chaplains: Chaplain[];
  onChaplainAction: (leaderId: string, action: 'confirmed' | 'declined', assignedId?: string, response?: string) => void;
}

const ChaplainScale: React.FC<ChaplainScaleProps> = ({ meetingSchedules, chaplains, onChaplainAction }) => {
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingSchedule | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<MeetingSchedule | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  const pendingRequests = meetingSchedules.filter(s => s.request_chaplain && s.chaplain_status === 'pending');
  const confirmedScale = meetingSchedules.filter(s => s.chaplain_status === 'confirmed');

  const checkAvailability = (chaplainId: string, date: string) => {
    return !confirmedScale.some(s => s.assigned_chaplain_id === chaplainId && s.full_date === date);
  };

  const handleConfirm = (assignedId: string) => {
    if (!selectedMeeting) return;
    onChaplainAction(selectedMeeting.leader_id, 'confirmed', assignedId);
    setSelectedMeeting(null);
  };

  const handleDeclineConfirm = (reason: string, message: string) => {
    if (!selectedMeeting) return;
    onChaplainAction(selectedMeeting.leader_id, 'declined', undefined, `${reason}: ${message}`);
    setShowDeclineModal(false);
    setSelectedMeeting(null);
  };

  const sendWhatsAppToChaplain = (meeting: MeetingSchedule) => {
    const chaplain = chaplains.find(c => c.id === meeting.assigned_chaplain_id);
    const dateFormatted = new Date(meeting.full_date).toLocaleString('pt-BR');
    const text = `*Escala Pastoral - Confirmação*%0A%0AOlá Pr. ${chaplain?.name}, você foi escalado para uma visita:%0A%0A📍 *PG:* ${meeting.pg_name}%0A🏥 *Setor:* ${meeting.sector_name}%0A🗓️ *Data:* ${dateFormatted}%0A👤 *Líder:* ${meeting.leader_name}%0A📞 *WhatsApp do Líder:* ${meeting.leader_whatsapp || 'Não informado'}%0A%0A_Favor confirmar o recebimento._`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const openWhatsAppLeader = (whatsapp: string) => {
    const cleanNumber = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanNumber}`, '_blank');
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Escala Pastoral</h2>
          <p className="text-slate-500 font-medium italic">Gestão centralizada de logística da Capelania.</p>
        </div>
        <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-xl">
           <FileText size={16}/> Relatório de Escala Semanal
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Solicitações Aguardando</h3>
          {pendingRequests.length === 0 ? (
            <div className="bg-white p-16 rounded-[3rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
              <CalendarCheck className="text-slate-200 mb-4" size={64} />
              <p className="text-slate-400 font-black text-lg italic tracking-tight">Sem pedidos pendentes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(req => (
                <div key={req.leader_id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-blue-600 transition-all">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl">
                      {req.pg_name?.charAt(0) || req.leader_name?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-black text-lg text-slate-800">{req.pg_name}</p>
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[9px] font-black uppercase">{req.sector_name}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-500 mt-1">Líder: {req.leader_name}</p>
                      <p className="text-[10px] font-black text-blue-600 flex items-center gap-2 mt-1">
                        <Phone size={12}/> {req.leader_whatsapp || 'Sem número'}
                      </p>
                      <div className="mt-3 flex items-center gap-3 text-xs font-black text-blue-600">
                        <Clock size={14}/> {new Date(req.full_date).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                       onClick={() => req.leader_whatsapp && openWhatsAppLeader(req.leader_whatsapp)}
                       className="p-4 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-colors"
                       title="Chamar no WhatsApp"
                    >
                      <MessageSquare size={20}/>
                    </button>
                    <button 
                      onClick={() => setSelectedMeeting(req)}
                      className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95"
                    >
                      Escalar Pastor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Agenda Confirmada</h3>
          <div className="bg-blue-950 p-10 rounded-[3rem] text-white shadow-2xl space-y-6 max-h-[700px] overflow-y-auto custom-scrollbar">
            {confirmedScale.length === 0 ? (
              <p className="text-blue-300 text-xs font-medium italic text-center py-10">Nenhuma visita confirmada.</p>
            ) : (
              confirmedScale.map(s => (
                <div 
                  key={s.leader_id} 
                  onClick={() => setViewingMeeting(s)}
                  className="p-5 bg-white/5 rounded-[2rem] border border-white/10 group hover:bg-white/10 transition-all cursor-pointer relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600/30 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><User size={18}/></div>
                      <div>
                        <p className="text-sm font-black truncate max-w-[120px]">{s.chaplain_assigned_name}</p>
                        <p className="text-[10px] font-black text-blue-400 uppercase truncate max-w-[120px]">{s.pg_name}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); sendWhatsAppToChaplain(s); }}
                      className="p-2 bg-white/10 rounded-lg hover:bg-blue-600 transition-colors text-blue-300 hover:text-white"
                      title="Enviar ao Capelão"
                    >
                      <Share2 size={16}/>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[9px] text-blue-200/60 font-medium flex items-center gap-2">
                      <Clock size={10}/> {new Date(s.full_date).toLocaleString('pt-BR')}
                    </p>
                    <ExternalLink size={12} className="text-white/20 group-hover:text-white/50 transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {viewingMeeting && (
        <ChaplainEventModal 
          meeting={viewingMeeting} 
          chaplains={chaplains}
          onClose={() => setViewingMeeting(null)} 
        />
      )}

      {selectedMeeting && !showDeclineModal && (
        <ChaplainAssignModal
          meeting={selectedMeeting}
          chaplains={chaplains}
          checkAvailability={checkAvailability}
          onClose={() => setSelectedMeeting(null)}
          onConfirm={handleConfirm}
          onDeclineRequest={() => setShowDeclineModal(true)}
        />
      )}

      {showDeclineModal && selectedMeeting && (
        <ChaplainDeclineModal
          leaderName={selectedMeeting.leader_name}
          onClose={() => setShowDeclineModal(false)}
          onConfirm={handleDeclineConfirm}
        />
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
    </div>
  );
};

export default ChaplainScale;
