
import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Calendar, X, AlertTriangle, Users, CalendarX2, UserX } from 'lucide-react';
import { MeetingSchedule, Chaplain, Leader } from '../types';
import { notifyChaplaincyOfNewInvite } from '../services/chaplaincyBridge';

interface MeetingScheduleModalProps {
  user: Leader;
  currentSchedule?: MeetingSchedule;
  chaplains: Chaplain[];
  allSchedules?: MeetingSchedule[];
  onClose: () => void;
  onSave: (schedule: Partial<MeetingSchedule>) => void;
}

const MeetingScheduleModal: React.FC<MeetingScheduleModalProps> = ({ 
  user, currentSchedule, chaplains, allSchedules = [], onClose, onSave 
}) => {
  const [date, setDate] = useState(currentSchedule?.full_date || '');
  const [requestChaplain, setRequestChaplain] = useState(currentSchedule?.request_chaplain || false);
  const [preferredId, setPreferredId] = useState(currentSchedule?.preferred_chaplain_id || '');
  const [requestNotes, setRequestNotes] = useState(currentSchedule?.request_notes || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const [conflictAlert, setConflictAlert] = useState<{ name: string, pg: string, availableAt: string } | null>(null);

  // Segurança: Funcionalidade restrita à unidade Belém
  const isBelem = user.hospital === 'Belém';

  const isWeekend = (dateString: string) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const day = d.getDay();
    return day === 0 || day === 6; 
  };

  const isWeekendSelected = isWeekend(date);
  const CONFLICT_WINDOW_MS = 30 * 60 * 1000; 

  const getConflict = (chaplainId: string) => {
    if (!date) return undefined;
    const proposedTime = new Date(date).getTime();
    return allSchedules.find(s => {
      if (s.leader_id === user.id) return false;
      if (s.assigned_chaplain_id !== chaplainId) return false;
      if (s.chaplain_status === 'confirmed') return true; 
      const existingTime = new Date(s.full_date).getTime();
      const diff = Math.abs(existingTime - proposedTime);
      return diff < CONFLICT_WINDOW_MS;
    });
  };

  const { areAllBusy, activeUnitChaplains } = useMemo(() => {
    if (!date) return { areAllBusy: false, activeUnitChaplains: [] };
    const activeChaplains = chaplains.filter(c => c.active);
    if (activeChaplains.length === 0) return { areAllBusy: false, activeUnitChaplains: [] };
    const busyCount = activeChaplains.filter(c => !!getConflict(c.id)).length;
    return { 
        activeUnitChaplains: activeChaplains,
        areAllBusy: busyCount === activeChaplains.length 
    };
  }, [date, chaplains, allSchedules]);

  useEffect(() => {
    if (isWeekendSelected || areAllBusy) {
        setRequestChaplain(false);
        setPreferredId('');
        setConflictAlert(null);
    }
  }, [date, areAllBusy, isWeekendSelected]);

  const handleChaplainClick = (chaplain: Chaplain, conflictSchedule?: MeetingSchedule) => {
      if (conflictSchedule) {
          if (preferredId === chaplain.id) setPreferredId('');
          const conflictTime = new Date(conflictSchedule.full_date);
          const availableTime = new Date(conflictTime.getTime() + CONFLICT_WINDOW_MS);
          const availableString = availableTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setConflictAlert({
              name: chaplain.name,
              pg: conflictSchedule.pg_name || 'Outro PG',
              availableAt: availableString
          });
      } else {
          setConflictAlert(null);
          setPreferredId(prev => prev === chaplain.id ? '' : chaplain.id);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    
    if (isBelem && requestChaplain) {
        if (preferredId) {
            const conflict = getConflict(preferredId);
            if (conflict) return;
        }
        if (!preferredId && areAllBusy) return;
    }

    setIsSaving(true);
    const finalRequestChaplain = (isWeekendSelected || areAllBusy) ? false : (isBelem ? requestChaplain : false);
    const newStatus = finalRequestChaplain ? 'pending' : 'none';

    // Ponte com o App de Capelania (Supabase)
    if (finalRequestChaplain) {
        await notifyChaplaincyOfNewInvite({
            pg_name: user.pg_name || `PG ${user.sector_name || 'Setor'}`,
            leader_name: user.full_name,
            leader_phone: user.whatsapp || '',
            unit: 'HAB', // Apenas Belém envia por enquanto
            date: new Date(date).toISOString(),
            request_notes: requestNotes,
            preferred_chaplain_id: preferredId || undefined
        });
    }

    onSave({ 
      full_date: date, 
      request_chaplain: finalRequestChaplain,
      request_notes: finalRequestChaplain ? requestNotes : undefined,
      preferred_chaplain_id: finalRequestChaplain ? preferredId : undefined,
      chaplain_status: newStatus,
      assigned_chaplain_id: null,
      chaplain_response: null,
      leader_name: user.full_name,
      leader_whatsapp: user.whatsapp,
      pg_name: user.pg_name || `PG ${user.sector_name || 'Setor'}`,
      sector_name: user.sector_name,
      hospital: user.hospital
    });
    
    setTimeout(() => onClose(), 500);
  };

  if (!isBelem) return null;

  return (
    <div className="fixed inset-0 bg-blue-950/80 backdrop-blur-md z-[210] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className="p-8 pb-4 flex justify-between items-start border-b border-slate-50">
          <div>
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Clock className="text-blue-600" size={28}/> Cronograma PG
            </h3>
            <p className="text-slate-500 font-medium text-xs mt-1">Defina a data do encontro semanal.</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:text-slate-800 transition-all"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Data e Hora do Encontro</label>
              <div className="relative">
                <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24}/>
                <input 
                  type="datetime-local" 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={`w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-slate-800 outline-none focus:ring-4 focus:ring-blue-600/10 transition-all`}
                  required
                />
              </div>
            </div>

            {isWeekendSelected && (
                <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
                    <div className="flex gap-3">
                        <CalendarX2 className="text-amber-600 shrink-0" size={24} />
                        <div>
                            <p className="text-xs font-black text-amber-800 uppercase mb-1">Aviso de Fim de Semana</p>
                            <p className="text-xs text-amber-700 font-medium leading-relaxed">
                                A Capelania não possui escala oficial aos Sábados e Domingos.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!isWeekendSelected && (
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Escala Pastoral</h4>
                
                {areAllBusy ? (
                   <div className="bg-orange-50 border-2 border-orange-100 p-5 rounded-2xl shadow-sm">
                      <div className="flex gap-3">
                          <UserX className="text-orange-500 shrink-0" size={28} />
                          <div>
                              <p className="text-sm font-black text-orange-800 uppercase mb-1">Agenda Lotada</p>
                              <p className="text-xs text-orange-700 font-medium leading-relaxed">
                                  Todos os capelães estão em atendimento neste horário exato.
                              </p>
                          </div>
                      </div>
                   </div>
                ) : (
                  <>
                    <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      requestChaplain ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}>
                       <input type="checkbox" className="mt-1 w-5 h-5 rounded accent-blue-600" checked={requestChaplain} onChange={e => setRequestChaplain(e.target.checked)} />
                       <div>
                         <span className="text-sm font-black text-slate-800 block">Solicitar Presença Pastoral</span>
                         <span className="text-[10px] text-slate-500 font-medium italic">Isso enviará um convite oficial via Supabase para a Capelania.</span>
                       </div>
                    </label>

                    {requestChaplain && (
                      <div className="space-y-6 animate-in slide-in-from-top-2">
                        {conflictAlert && (
                            <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl">
                                <div className="flex gap-3 items-start">
                                    <AlertTriangle className="text-red-600 shrink-0 mt-1" size={24} />
                                    <div>
                                        <p className="text-sm font-black text-red-800 uppercase mb-1">Capelão Indisponível</p>
                                        <p className="text-xs text-red-700 font-medium leading-relaxed">{conflictAlert.name} já está confirmado no {conflictAlert.pg}.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-2">Sugerir Capelão</label>
                          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                            <button 
                                type="button"
                                onClick={() => { setConflictAlert(null); setPreferredId(''); }}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${preferredId === '' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500'}`}
                            >
                                <Users size={16} /> <span className="text-sm font-bold">Sem preferência</span>
                            </button>

                            {activeUnitChaplains.map(c => {
                              const conflictSchedule = getConflict(c.id);
                              const hasConflict = !!conflictSchedule;
                              return (
                                <button 
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleChaplainClick(c, conflictSchedule as any)}
                                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${hasConflict ? 'bg-slate-50 text-slate-400 opacity-60' : preferredId === c.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-700'}`}
                                >
                                  <span className="text-sm font-bold">{c.name}</span>
                                  {hasConflict && <span className="text-[8px] font-black uppercase bg-red-100 text-red-600 px-2 py-1 rounded-full">Ocupado</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <textarea 
                          value={requestNotes}
                          onChange={e => setRequestNotes(e.target.value)}
                          placeholder="Pedidos de oração ou observações..."
                          className="w-full h-24 p-4 bg-blue-50/30 border border-blue-100 rounded-xl text-sm font-medium outline-none resize-none"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <button type="submit" disabled={isSaving || !date || (requestChaplain && !!conflictAlert) || (requestChaplain && areAllBusy)} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
              {isSaving ? 'Notificando Capelania...' : 'Confirmar e Notificar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MeetingScheduleModal;
