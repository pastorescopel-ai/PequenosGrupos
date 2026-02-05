
import React, { useState, useMemo } from 'react';
import { History, CalendarPlus } from 'lucide-react';
import { Leader, ChangeRequest, MeetingSchedule, Chaplain, Collaborator, PGMeetingPhoto } from '../types';
import MeetingScheduleModal from './MeetingScheduleModal';
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
  leaders?: Leader[]; 
}

const LeaderDashboard: React.FC<LeaderDashboardProps> = ({ 
  user, onUpdateUser, memberRequests, meetingSchedule, allSchedules, chaplains = [], 
  onUpdateSchedule, members, photos = []
}) => {
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);

  const activeMembersCount = useMemo(() => {
      const pgMembersCount = members.filter(m => (m as any).pg_name === user.pg_name && m.active !== false).length;
      return pgMembersCount + 1; 
  }, [members, user.pg_name]);

  const nextMeetingDate = meetingSchedule ? new Date(meetingSchedule.full_date) : null;
  const isMeetingScheduled = nextMeetingDate && nextMeetingDate > new Date();

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-left pb-10">
      
      <NotificationBanner user={user} onUpdateUser={onUpdateUser} />

      {/* CARDS DE MÉTRICAS 3D */}
      <div className="grid grid-cols-2 gap-4">
          <StatCard3D label="Membros" value={activeMembersCount} emoji="👥" color="from-blue-50 to-blue-100" />
          <StatCard3D label="Fotos" value={photos.filter(p => p.leader_id === user.id).length} emoji="📸" color="from-purple-50 to-purple-100" />
          <StatCard3D label="Pedidos" value={memberRequests.filter(r => r.leader_id === user.id).length} emoji="📝" color="from-orange-50 to-orange-100" />
          <StatCard3D label="Visitas" value={allSchedules ? allSchedules.filter(s => s.leader_id === user.id && s.chaplain_status === 'confirmed').length : 0} emoji="🤝" color="from-emerald-50 to-emerald-100" />
      </div>

      {/* PRÓXIMO ENCONTRO (CLAY STYLE) */}
      <div className="clay-card p-10 relative overflow-hidden group">
          <div className="absolute -right-8 -bottom-8 text-[160px] opacity-[0.08] pointer-events-none select-none">🗓️</div>
          <div className="relative z-10">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">
                {isMeetingScheduled ? 'Próximo Encontro' : 'Agendar Encontro'}
              </h2>
              {isMeetingScheduled ? (
                  <p className="text-xl font-black text-blue-600 mb-8">{nextMeetingDate?.toLocaleDateString()} às {nextMeetingDate?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
              ) : (
                  <p className="text-slate-400 font-medium mb-8 text-sm uppercase tracking-widest">Sem data definida para esta semana</p>
              )}
              <button onClick={() => setIsEditingMeeting(true)} className="bg-blue-600 text-white w-full py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 btn-3d-press shadow-blue-200">
                  <CalendarPlus size={20} /> {isMeetingScheduled ? 'Alterar Data' : 'Agendar Agora'}
              </button>
          </div>
      </div>

      <section className="bg-white/50 border border-slate-100 p-8 rounded-[2.5rem]">
        <h3 className="text-xs font-black text-slate-400 flex items-center gap-3 mb-6 uppercase tracking-[0.2em]"><History size={16}/> Timeline Recente</h3>
        <div className="space-y-4">
           {memberRequests.filter(r => r.leader_id === user.id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 2).map(req => (
             <div key={req.id} className="p-5 bg-white rounded-3xl border border-slate-50 flex items-center gap-4 shadow-sm">
                <div className="text-2xl filter drop-shadow-sm">{req.type === 'add' ? '📥' : '📤'}</div>
                <div className="min-w-0">
                  <p className="font-black text-slate-800 text-sm truncate">{req.collaborator_name}</p>
                  <p className={`text-[9px] font-black uppercase mt-0.5 ${req.status === 'pending' ? 'text-orange-500' : 'text-emerald-500'}`}>
                    {req.status === 'pending' ? 'Em Análise' : 'Processado'}
                  </p>
                </div>
             </div>
           ))}
        </div>
      </section>

      {isEditingMeeting && user.hospital === 'Belém' && (
        <MeetingScheduleModal user={user} currentSchedule={meetingSchedule} allSchedules={allSchedules} chaplains={chaplains} onClose={() => setIsEditingMeeting(false)} onSave={(d) => { onUpdateSchedule(d); setIsEditingMeeting(false); }} />
      )}
    </div>
  );
};

const StatCard3D = ({ label, value, emoji, color }: any) => (
    <div className={`bg-gradient-to-br ${color} p-6 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 border border-white shadow-lg shadow-black/5 active:scale-95 transition-all`}>
        <div className="text-4xl emoji-3d mb-1">{emoji}</div>
        <div className="text-center">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-3xl font-black text-slate-800 leading-none">{value}</p>
        </div>
    </div>
);

export default LeaderDashboard;
