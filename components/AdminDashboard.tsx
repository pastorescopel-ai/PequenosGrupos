
import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  Hospital, 
  Target, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  ChevronRight,
  BellRing,
  UserPlus
} from 'lucide-react';
import { MeetingSchedule, Leader, Collaborator, Sector, ChangeRequest } from '../types';

interface AdminDashboardProps {
  user: Leader;
  onUpdateUser: (data: Partial<Leader>) => Promise<void>;
  meetingSchedules: MeetingSchedule[];
  onNavigateToScale: () => void;
  leaders: Leader[];
  members: Collaborator[];
  sectors: Sector[];
  memberRequests?: ChangeRequest[];
  onNavigateToMembers?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user,
  onUpdateUser,
  meetingSchedules, 
  onNavigateToScale, 
  leaders, 
  members, 
  sectors,
  memberRequests = [],
  onNavigateToMembers
}) => {
  const pendingRequests = meetingSchedules.filter(s => s.request_chaplain && s.chaplain_status === 'pending');
  const pendingMembers = memberRequests.filter(r => r.status === 'pending');
  const activeLeaders = leaders.filter(l => l.active);
  const activeMembers = members.filter(m => m.active !== false);

  const totalActiveParticipants = useMemo(() => {
    const combined = [
      ...activeMembers.map(m => m.employee_id),
      ...activeLeaders.map(l => l.employee_id)
    ];
    return new Set(combined).size;
  }, [activeMembers, activeLeaders]);

  const sectorsCount = sectors.length;
  const sectorsWithPGs = sectors.filter(s => 
    members.some(m => m.sector_name === s.name && m.active !== false) ||
    leaders.some(l => l.sector_name === s.name && l.active)
  ).length;

  const coveragePercent = sectorsCount > 0 ? (sectorsWithPGs / sectorsCount) * 100 : 0;

  const unitsData = [
    { 
      name: 'Belém', 
      count: activeMembers.filter(m => m.hospital === 'Belém').length + activeLeaders.filter(l => l.hospital === 'Belém').length,
      color: 'bg-blue-600' 
    },
    { 
      name: 'Barcarena', 
      count: activeMembers.filter(m => m.hospital === 'Barcarena').length + activeLeaders.filter(l => l.hospital === 'Barcarena').length,
      color: 'bg-indigo-500' 
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Visão Geral</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Monitoramento Master</p>
        </div>
      </header>

      <div className="space-y-4">
          {pendingRequests.length > 0 && (
            <div className="bg-blue-600 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-100 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center animate-bounce">
                  <BellRing size={28} />
                </div>
                <div>
                  <h4 className="font-black text-lg">Pedidos de Capelania Aguardando</h4>
                  <p className="text-blue-100 text-sm font-medium">Você tem {pendingRequests.length} {pendingRequests.length === 1 ? 'solicitação pendente' : 'solicitações pendentes'}.</p>
                </div>
              </div>
              <button 
                onClick={onNavigateToScale}
                className="bg-white text-blue-600 px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-blue-50 transition-all shadow-lg active:scale-95"
              >
                Acessar Escala Pastoral <ChevronRight size={16} />
              </button>
            </div>
          )}

          {pendingMembers.length > 0 && (
            <div className="bg-orange-500 rounded-[2rem] p-6 text-white shadow-xl shadow-orange-100 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                  <UserPlus size={28} />
                </div>
                <div>
                  <h4 className="font-black text-lg">Membros de Outros Setores</h4>
                  <p className="text-orange-100 text-sm font-medium">Há {pendingMembers.length} {pendingMembers.length === 1 ? 'colaborador aguardando' : 'colaboradores aguardando'} aprovação de vínculo.</p>
                </div>
              </div>
              <button 
                onClick={onNavigateToMembers}
                className="bg-white text-orange-600 px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-orange-50 transition-all shadow-lg active:scale-95"
              >
                Analisar Pendências <ChevronRight size={16} />
              </button>
            </div>
          )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Total Integrantes" value={totalActiveParticipants.toString()} icon={<Users size={32}/>} color="text-blue-600" />
        <StatCard label="Líderes Ativos" value={activeLeaders.length.toString()} icon={<Activity size={32}/>} color="text-emerald-500" />
        <StatCard label="Setores Ativos" value={`${coveragePercent.toFixed(0)}%`} icon={<Target size={32}/>} color="text-amber-500" />
        <StatCard label="Setores Totais" value={sectorsCount.toString()} icon={<Hospital size={32}/>} color="text-slate-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
              <BarChart3 className="text-slate-400" size={20}/> Participação por Unidade
            </h3>
          </div>
          <div className="space-y-10 py-4">
            {unitsData.map((unit) => {
              const percent = totalActiveParticipants > 0 ? (unit.count / totalActiveParticipants) * 100 : 0;
              return (
                <div key={unit.name} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{unit.name}</p>
                      <p className="text-xl font-black text-slate-800">{unit.count} Integrantes</p>
                    </div>
                    <p className="text-2xl font-black text-blue-600">{percent.toFixed(0)}%</p>
                  </div>
                  <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden">
                    <div className={`h-full ${unit.color} rounded-full transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="bg-blue-950 p-10 rounded-[2.5rem] text-white shadow-xl flex flex-col border border-blue-900 relative overflow-hidden">
          <TrendingUp className="absolute -right-10 -bottom-10 text-white/5" size={200} />
          <h3 className="text-xs font-black mb-8 flex items-center gap-2 relative z-10 uppercase tracking-widest text-blue-400">
            <TrendingUp size={16}/> Top Setores
          </h3>
          <div className="flex-1 space-y-4 relative z-10">
            {sectors.filter(s => leaders.some(l => l.sector_name === s.name && l.active)).slice(0, 6).map(s => (
              <div key={s.id} className="flex items-center justify-between group py-2 border-b border-white/5 last:border-0">
                <div><p className="text-sm font-bold group-hover:text-blue-300 transition-colors truncate max-w-[150px]">{s.name}</p></div>
                <span className={`text-[9px] font-black uppercase text-blue-500 bg-blue-900/50 px-2 py-1 rounded`}>{s.code}</span>
              </div>
            ))}
            {sectors.length === 0 && <p className="text-blue-300/50 italic text-sm">Nenhum setor cadastrado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all flex flex-col items-center justify-center gap-3">
    <div className={`${color} mb-1`}>{icon}</div>
    <div className="text-center">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-4xl font-black text-slate-800 leading-none">{value}</p>
    </div>
  </div>
);

export default AdminDashboard;
