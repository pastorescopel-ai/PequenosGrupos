
import React, { useState, useMemo } from 'react';
import { History, CalendarPlus, CheckCircle2, AlertCircle, Calendar, ArrowRight, XCircle, Info } from 'lucide-react';
import { Leader, ChangeRequest, MeetingSchedule, Chaplain, Collaborator, PGMeetingPhoto } from '../types';
import MeetingScheduleModal from './MeetingScheduleModal';
import DashboardStats from './DashboardStats';
import NotificationBanner from './NotificationBanner';

interface LeaderDashboardProps {
  user: Leader;
  onUpdateUser: (data: Partial<Leader>) => Promise<void>;
  memberRequests: ChangeRequest[];
  meetingSchedule?: MeetingSchedule;
  allSchedules?: MeetingSchedule[];
  chaplains?: Chaplain[];
  onUpdateSchedule: (schedule: Partial<MeetingSchedule>) => void;
  members: Collaborator[];
  photos?: PGMeetingPhoto[];
}

const LeaderDashboard: React.FC<LeaderDashboardProps> = ({ 
  user, onUpdateUser, memberRequests, meetingSchedule, allSchedules, chaplains = [], onUpdateSchedule, members, photos = []
}) => {
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);

  const isBelem = user.hospital === 'Belém';

  const coveragePercent = useMemo(() => {
    const sectorMembers = members.filter(m => m.sector_name === user.sector_name && m.active !== false && m.employee_id !== user.employee_id);
    const totalActiveInPG = sectorMembers.length + 1;
    const denominator = 20; 
    return Math.min((totalActiveInPG / denominator) * 100, 100);
  }, [members, user.sector_name, user.employee_id]);

  const nextMeetingDate = meetingSchedule ? new Date(meetingSchedule.full_date) : null;
  const isMeetingScheduled = nextMeetingDate && nextMeetingDate > new Date();
  const isDeclined = meetingSchedule?.chaplain_status === 'declined';

  let dashboardMode: 'PLAN' | 'DECLINED' | 'UNAVAILABLE' = 'PLAN';
  
  if (!isBelem) {
      dashboardMode = 'UNAVAILABLE';
  } else if (isDeclined) {
      dashboardMode = 'DECLINED';
  }

  const handleConfirmSchedule = () => {
      alert(`✅ Agendamento Confirmado!\n\nSeu encontro está definido para:\n📅 ${nextMeetingDate?.toLocaleDateString()}\n⏰ ${nextMeetingDate?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* BANNER DE NOTIFICAÇÃO (SE NECESSÁRIO) */}
      <NotificationBanner user={user} onUpdateUser={onUpdateUser} />

      <div className="w-full">
         {dashboardMode === 'UNAVAILABLE' && (
            <div className="bg-slate-100 border border-slate-200 rounded-[3rem] p-10 text-slate-500 shadow-inner relative overflow-hidden">
                <Info size={200} className="absolute -right-10 -bottom-10 text-slate-200/50 rotate-12" />
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 bg-slate-200 px-4 py-2 rounded-full mb-4">
                        <Info size={16} className="text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidade {user.hospital}</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 mb-4">Agenda em Breve</h2>
                    <p className="text-slate-500 font-medium text-lg max-w-xl">
                        O sistema de agendamento e convite pastoral digital está disponível apenas para a unidade <b>Belém</b>. Para outras unidades, utilize os canais manuais.
                    </p>
                </div>
            </div>
         )}

         {dashboardMode === 'DECLINED' && (
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-red-200 relative overflow-hidden">
                <XCircle size={200} className="absolute -right-10 -bottom-10 text-white/10 rotate-12" />
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-4 backdrop-blur-sm">
                        <AlertCircle size={16} className="text-white" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Solicitação Recusada</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Agenda Não Confirmada</h2>
                    <p className="text-red-100 font-medium text-lg max-w-xl mb-6">
                        Justificativa: "{meetingSchedule?.chaplain_response || 'Indisponibilidade de agenda'}".
                    </p>
                    <button 
                        onClick={() => setIsEditingMeeting(true)}
                        className="bg-white text-red-600 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:scale-105 transition-transform shadow-xl"
                    >
                        <CalendarPlus size={20} /> Agendar Nova Data
                    </button>
                </div>
            </div>
         )}

         {dashboardMode === 'PLAN' && (
            <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
                <Calendar size={200} className="absolute -right-10 -bottom-10 text-slate-50 group-hover:text-blue-50 transition-colors rotate-12" />
                <div className="relative z-10 flex flex-col items-start">
                    <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full mb-4">
                        <CalendarPlus size={16} className="text-slate-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Planejamento</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 mb-2">Próximo Encontro</h2>
                    <p className="text-slate-500 font-medium text-lg max-w-xl mb-8">
                        {isMeetingScheduled 
                            ? `Tudo certo! Agendado para ${nextMeetingDate?.toLocaleDateString()} às ${nextMeetingDate?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`
                            : 'Você ainda não definiu a data do encontro desta semana. Vamos agendar?'}
                    </p>
                    
                    {isMeetingScheduled ? (
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button 
                                onClick={handleConfirmSchedule}
                                className="flex-1 sm:flex-none bg-green-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-green-700 shadow-xl shadow-green-100 transition-all active:scale-95"
                            >
                                <CheckCircle2 size={18} /> Confirmar Agenda
                            </button>
                            <button 
                                onClick={() => setIsEditingMeeting(true)}
                                className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-500 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 hover:text-blue-600 transition-all hover:border-blue-200"
                            >
                                 Alterar
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsEditingMeeting(true)}
                            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-blue-700 hover:scale-105 transition-all shadow-xl shadow-blue-200"
                        >
                            <CalendarPlus size={20} /> Agendar Encontro
                        </button>
                    )}
                </div>
            </div>
         )}
      </div>

      <div className="w-full">
        <DashboardStats 
            sectorName={user.sector_name || ''} 
            coveragePercent={coveragePercent} 
        />
      </div>

      <section className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200/50">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-4 mb-6">
            <History className="text-slate-400"/> Atividades Recentes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {memberRequests.filter(r => r.leader_id === user.id).slice(0, 3).map(req => (
             <div key={req.id} className="p-5 bg-white rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${req.type === 'add' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                    {req.type === 'add' ? <ArrowRight size={18} className="-rotate-45"/> : <ArrowRight size={18} className="rotate-45"/>}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{req.collaborator_name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{req.type === 'add' ? 'Admissão' : 'Desligamento'} • {req.status}</p>
                </div>
             </div>
           ))}
        </div>
      </section>

      {isEditingMeeting && isBelem && (
        <MeetingScheduleModal 
          user={user} 
          currentSchedule={meetingSchedule} 
          allSchedules={allSchedules}
          chaplains={chaplains}
          onClose={() => setIsEditingMeeting(false)} 
          onSave={(d) => { onUpdateSchedule(d); setIsEditingMeeting(false); }} 
        />
      )}
    </div>
  );
};

export default LeaderDashboard;
