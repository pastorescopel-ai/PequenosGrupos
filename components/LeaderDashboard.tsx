
import React, { useState, useMemo } from 'react';
import { History, CalendarPlus, CheckCircle2 } from 'lucide-react';
import { Leader, ChangeRequest, MeetingSchedule, Chaplain, Collaborator, PGMeetingPhoto } from '../types';
import MeetingScheduleModal from './MeetingScheduleModal';
import DashboardStats from './DashboardStats';

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
  leaders?: Leader[]; 
}

const LeaderDashboard: React.FC<LeaderDashboardProps> = ({ 
  user, onUpdateUser, memberRequests, meetingSchedule, allSchedules, chaplains = [], onUpdateSchedule, members, photos = [], leaders = []
}) => {
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);

  const isBelem = user.hospital === 'Belém';

  const coveragePercent = useMemo(() => {
    const activeMembersInSector = members.filter(m => m.sector_name === user.sector_name && m.active !== false);
    const activeLeadersInSector = leaders.filter(l => l.sector_name === user.sector_name && l.active);
    
    const uniqueParticipantsIds = new Set([
      ...activeMembersInSector.map(m => m.employee_id),
      ...activeLeadersInSector.map(l => l.employee_id)
    ]);

    const totalActiveInSector = uniqueParticipantsIds.size;
    const denominator = 20; 
    
    return Math.min((totalActiveInSector / denominator) * 100, 100);
  }, [members, leaders, user.sector_name]);

  const activeMembersCount = useMemo(() => {
      return members.filter(m => (m as any).pg_name === user.pg_name && m.active !== false).length;
  }, [members, user.pg_name]);

  const myRequestsCount = useMemo(() => {
      return memberRequests.filter(r => r.leader_id === user.id).length;
  }, [memberRequests, user.id]);

  const myPhotosCount = useMemo(() => {
      return photos.filter(p => p.leader_id === user.id).length;
  }, [photos, user.id]);

  const myVisitsCount = useMemo(() => {
      return allSchedules ? allSchedules.filter(s => s.leader_id === user.id && (s.chaplain_status === 'confirmed' || s.chaplain_status === 'pending')).length : 0;
  }, [allSchedules, user.id]);

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
      
      {/* --- EMOJI STATS GRID --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <ProStatCard 
             label="Membros Ativos" 
             value={activeMembersCount} 
             emoji="👥" 
          />
          <ProStatCard 
             label="Encontros (Fotos)" 
             value={myPhotosCount} 
             emoji="📸" 
          />
          <ProStatCard 
             label="Solicitações" 
             value={myRequestsCount} 
             emoji="📝" 
          />
          <ProStatCard 
             label="Visitas Pastorais" 
             value={myVisitsCount} 
             emoji="🤝" 
          />
      </div>

      <div className="w-full">
         {dashboardMode === 'UNAVAILABLE' && (
            <div className="bg-slate-100 border border-slate-200 rounded-[2.5rem] p-10 text-slate-500 shadow-inner relative overflow-hidden">
                <div className="absolute -right-5 -bottom-5 text-[150px] opacity-10 filter grayscale">ℹ️</div>
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 bg-slate-200 px-4 py-2 rounded-full mb-4">
                        <span className="text-base">📍</span>
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
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-red-200 relative overflow-hidden">
                <div className="absolute -right-5 -bottom-5 text-[150px] opacity-20">🚫</div>
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-4 backdrop-blur-sm">
                        <span className="text-base">⚠️</span>
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
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
                <div className="absolute -right-8 -bottom-8 text-[180px] opacity-10 group-hover:opacity-20 transition-opacity filter drop-shadow-sm select-none">🗓️</div>
                <div className="relative z-10 flex flex-col items-start">
                    <div className="inline-flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full mb-6 border border-slate-100">
                        <span className="text-base">📌</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Próximo Encontro</span>
                    </div>
                    
                    {isMeetingScheduled ? (
                        <>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-800 mb-2">
                                {nextMeetingDate?.toLocaleDateString('pt-BR', {day: '2-digit', month: 'long'})}
                            </h2>
                            <p className="text-xl font-bold text-slate-400 mb-8 flex items-center gap-2">
                                às {nextMeetingDate?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <button 
                                    onClick={handleConfirmSchedule}
                                    className="flex-1 sm:flex-none bg-green-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-green-700 shadow-xl shadow-green-100 transition-all active:scale-95"
                                >
                                    <CheckCircle2 size={18} /> Confirmar
                                </button>
                                <button 
                                    onClick={() => setIsEditingMeeting(true)}
                                    className="flex-1 sm:flex-none bg-white border-2 border-slate-100 text-slate-400 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 hover:text-slate-600 transition-all"
                                >
                                     Alterar
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 mb-4">Não Agendado</h2>
                            <p className="text-slate-400 font-medium mb-8 max-w-md">
                                Defina a data e horário do encontro desta semana para notificar os membros.
                            </p>
                            <button 
                                onClick={() => setIsEditingMeeting(true)}
                                className="bg-blue-950 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-xl"
                            >
                                <CalendarPlus size={20} /> Agendar Agora
                            </button>
                        </>
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

      <section className="bg-slate-100 p-10 rounded-[2.5rem] border border-slate-200/50">
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-widest">
            <History className="text-slate-400" size={20}/> Atividades Recentes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {memberRequests.filter(r => r.leader_id === user.id).length === 0 ? (
               <div className="col-span-full text-center py-8 text-slate-400 font-bold italic">Nenhuma atividade registrada.</div>
           ) : (
               memberRequests.filter(r => r.leader_id === user.id).slice(0, 3).map(req => (
                 <div key={req.id} className="p-6 bg-white rounded-3xl border border-slate-200 flex items-center gap-5 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl`}>
                        {req.type === 'add' ? '📥' : '📤'}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">{req.collaborator_name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{req.type === 'add' ? 'Admissão' : 'Desligamento'} • {req.status}</p>
                    </div>
                 </div>
               ))
           )}
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

const ProStatCard = ({ label, value, emoji }: any) => (
    <div className="bg-white border border-slate-100 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300">
        <div className="text-3xl filter drop-shadow-sm mb-1">
            {emoji}
        </div>
        <div className="text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
            <p className="text-4xl font-black text-slate-800 leading-none">{value}</p>
        </div>
    </div>
);

export default LeaderDashboard;
