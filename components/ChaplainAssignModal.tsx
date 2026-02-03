
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MeetingSchedule, Chaplain } from '../types';

interface ChaplainAssignModalProps {
  meeting: MeetingSchedule;
  chaplains: Chaplain[];
  onClose: () => void;
  onConfirm: (assignedId: string) => void;
  onDeclineRequest: () => void;
  checkAvailability: (chaplainId: string, date: string) => boolean;
}

const ChaplainAssignModal: React.FC<ChaplainAssignModalProps> = ({ 
  meeting, chaplains, onClose, onConfirm, onDeclineRequest, checkAvailability 
}) => {
  const [assignedId, setAssignedId] = useState(meeting.preferred_chaplain_id || '');

  return (
    <div className="fixed inset-0 bg-blue-950/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h4 className="text-2xl font-black text-slate-800 tracking-tight">Atender Solicitação</h4>
            <p className="text-slate-500 text-sm font-medium">{meeting.pg_name} • {meeting.sector_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-800"><X size={24}/></button>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
              <p className="text-[10px] font-black text-blue-600 uppercase mb-2">WhatsApp do Líder:</p>
              <p className="font-black text-slate-800 text-lg">{meeting.leader_whatsapp || 'Não informado'}</p>
              {meeting.request_notes && <p className="text-xs text-blue-700 italic mt-3 font-medium">"{meeting.request_notes}"</p>}
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Designar Pastor Disponível</label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {chaplains.filter(c => c.active).map(c => {
                const available = checkAvailability(c.id, meeting.full_date);
                return (
                  <button 
                    key={c.id}
                    disabled={!available}
                    onClick={() => setAssignedId(c.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                      !available ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed' :
                      assignedId === c.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 hover:border-blue-200'
                    }`}
                  >
                    <span className="font-black text-sm">{c.name}</span>
                    {!available && <span className="text-[9px] font-black text-red-500 uppercase">Em Outra Escala</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
              <button onClick={onDeclineRequest} className="flex-1 py-5 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all">Informar Indisponibilidade</button>
              <button onClick={() => onConfirm(assignedId)} disabled={!assignedId} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-50 transition-all">Confirmar Visita</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChaplainAssignModal;
