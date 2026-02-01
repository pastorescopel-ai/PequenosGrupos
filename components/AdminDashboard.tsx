
import React from 'react';
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
import NotificationBanner from './NotificationBanner';

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
  const activeLeadersCount = leaders.filter(l => l.active).length;
  const totalMembersCount = members.length;
  const sectorsCount = sectors.length;

  const sectorsWithMembers = sectors.filter(s => members.some(m => m.sector_name === s.name)).length;
  const coveragePercent = sectorsCount > 0 ? (sectorsWithMembers / sectorsCount) * 100 : 0;

  const unitsData = [
    { 
      name: 'Belém', 
      members: members.filter(m => leaders.find(l => l.full_name === m.full_name)?.hospital === 'Belém' || true).length, 
      color: 'bg-blue-600' 
    },
    { 
      name: 'Barcarena', 
      members: 0,
      color: 'bg-indigo-500' 
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard Analítico</h2>
          <p className="text-slate-500">Monitoramento baseado nos dados atuais de simulação.</p>
        </div>
      </header>

      {/* BANNER DE NOTIFICAÇÃO (SE NECESSÁRIO) */}
      <NotificationBanner user={user} onUpdateUser={onUpdateUser} />

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Membros" value={totalMembersCount.toString()} sub="Cadastrados na sessão" icon={<Users size={20}/>} trend="up" />
        <StatCard label="Líderes Ativos" value={activeLeadersCount.toString()} sub="Acessos habilitados" icon={<Activity size={20}/>} trend="up" />
        <StatCard label="Média de Cobertura" value={`${coveragePercent.toFixed(1)}%`} sub="Sectores c/ PGs" icon={<Target size={20}/>} trend={coveragePercent >= 80 ? 'up' : 'down'} />
        <StatCard label="Setores Totais" value={sectorsCount.toString()} sub="Importados da base" icon={<Hospital size={20}/>} trend="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-blue-600" size={24}/> Engajamento por Unidade
            </h3>
          </div>
          <div className="space-y-10 py-4">
            {unitsData.map((unit) => {
              const percent = totalMembersCount > 0 ? (unit.members / totalMembersCount) * 100 : 0;
              return (
                <div key={unit.name} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{unit.name}</p>
                      <p className="text-xl font-bold text-slate-800">{unit.members} Membros</p>
                    </div>
                    <p className="text-2xl font-black text-blue-600">{percent.toFixed(0)}%</p>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${unit.color} rounded-full transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="bg-blue-950 p-10 rounded-[3rem] text-white shadow-xl flex flex-col border border-blue-900 relative overflow-hidden">
          <TrendingUp className="absolute -right-10 -bottom-10 text-white/5" size={200} />
          <h3 className="text-lg font-bold mb-8 flex items-center gap-2 relative z-10">
            <TrendingUp className="text-blue-400" size={20}/> Setores Recentes
          </h3>
          <div className="flex-1 space-y-6 relative z-10">
            {sectors.slice(-5).map(s => (
              <div key={s.id} className="flex items-center justify-between group">
                <div><p className="text-sm font-bold group-hover:text-blue-400 transition-colors truncate max-w-[150px]">{s.name}</p></div>
                <span className={`text-[10px] font-black uppercase text-blue-400`}>{s.code}</span>
              </div>
            ))}
            {sectors.length === 0 && <p className="text-blue-300/50 italic text-sm">Nenhum setor cadastrado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, sub, icon, trend }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-100 transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-50 text-blue-600 rounded-2xl">{icon}</div>
      <div className={`text-[10px] font-black uppercase ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
        {trend === 'up' ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
      </div>
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-3xl font-black text-slate-800 mb-2">{value}</p>
    <p className="text-[10px] text-slate-500 font-medium italic">{sub}</p>
  </div>
);

export default AdminDashboard;
