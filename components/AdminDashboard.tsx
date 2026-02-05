
import React, { useMemo } from 'react';
import { 
  Users, Activity, Building2, Percent, ShieldCheck, Calendar, Camera, LayoutGrid, Clock
} from 'lucide-react';
import { MeetingSchedule, Leader, Collaborator, Sector, ChangeRequest, PGMeetingPhoto } from '../types';
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
  onNavigateToMembers?: (pgName?: string) => void;
  allCollaborators?: Collaborator[];
  photos?: PGMeetingPhoto[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user, onUpdateUser, meetingSchedules, onNavigateToScale, leaders, members, sectors, memberRequests = [], onNavigateToMembers, allCollaborators = [], photos = []
}) => {
  const pendingRequests = meetingSchedules.filter(s => s.request_chaplain && s.chaplain_status === 'pending');
  const pendingMembers = memberRequests.filter(r => r.status === 'pending');
  const activeLeaders = leaders.filter(l => l.active);

  const stats = useMemo(() => {
    const calculateForUnit = (unit: 'Belém' | 'Barcarena') => {
        const rhBase = allCollaborators.filter(c => c.active && (c.hospital === unit || (!c.hospital && unit === 'Belém')));
        const unitSectors = sectors.filter(s => s.active && (s.hospital === unit || !s.hospital));
        
        const participants = new Set([
            ...members.filter(m => m.active !== false && (m.hospital === unit || (!m.hospital && unit === 'Belém'))).map(m => m.employee_id),
            ...leaders.filter(l => l.active && l.hospital === unit).map(l => l.employee_id)
        ]);

        const coverage = rhBase.length > 0 ? (participants.size / rhBase.length) * 100 : 0;

        return {
            rh: rhBase.length,
            sectors: unitSectors.length,
            active: participants.size,
            coverage
        };
    };

    return {
        belem: calculateForUnit('Belém'),
        barcarena: calculateForUnit('Barcarena'),
        global: {
            leaders: activeLeaders.length,
            evidence: photos.length,
            pending: pendingRequests.length + pendingMembers.length
        }
    };
  }, [allCollaborators, members, leaders, sectors, photos, pendingRequests, pendingMembers]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-16 text-left">
      
      <NotificationBanner user={user} onUpdateUser={onUpdateUser} />

      {/* HEADER DE BOAS VINDAS */}
      <div className="clay-card p-10 relative overflow-hidden bg-white/40">
          <div className="absolute -right-6 -top-6 text-[120px] opacity-10 filter drop-shadow-xl select-none rotate-12">🛡️</div>
          <div className="relative z-10">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Olá, Diretor</h2>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-8">Administração Ministerial Unificada</p>
              
              <div className="flex flex-wrap gap-4">
                  {pendingRequests.length > 0 && (
                      <button onClick={onNavigateToScale} className="bg-blue-600 text-white px-6 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 btn-3d-press shadow-blue-100">
                          <Calendar size={18}/> {pendingRequests.length} Escala Pastoral
                      </button>
                  )}
                  {pendingMembers.length > 0 && (
                      <button onClick={() => onNavigateToMembers?.()} className="bg-orange-50 text-white px-6 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 btn-3d-press shadow-orange-100">
                          <Users size={18}/> {pendingMembers.length} Pedidos de Vínculo
                      </button>
                  )}
              </div>
          </div>
      </div>

      {/* CAMADA 1: RESUMO EXECUTIVO (GLOBAL) */}
      <div className="space-y-4">
          <div className="flex items-center gap-3 px-2">
              <LayoutGrid size={16} className="text-slate-400" />
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Visão Executiva Global</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ExecutiveCard label="Líderes Ativos" value={stats.global.leaders} emoji="👔" color="bg-blue-600" />
              <ExecutiveCard label="Evidências Enviadas" value={stats.global.evidence} emoji="📸" color="bg-purple-600" />
              <ExecutiveCard label="Pendências Totais" value={stats.global.pending} emoji="⏳" color="bg-orange-600" />
          </div>
      </div>

      {/* CAMADA 2: MÉTRICAS ESTRITAS (UNITÁRIAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* PAINEL BELÉM (HAB) */}
          <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Unidade Belém (HAB)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <AdminStatCard label="Membros HAB" value={stats.belem.active} emoji="👥" color="from-blue-50/50 to-blue-100/50" />
                  <AdminStatCard label="Setores HAB" value={stats.belem.sectors} emoji="🏢" color="from-slate-50 to-slate-100" />
              </div>
              {/* BARRA DE PROGRESSO HAB */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-end mb-4 relative z-10">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Adesão Ministerial HAB</p>
                          <p className="text-[9px] font-bold text-blue-600/60 uppercase">Meta Institucional: 80%</p>
                      </div>
                      <p className="text-3xl font-black text-blue-600">{stats.belem.coverage.toFixed(1)}%</p>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex items-center px-1 relative z-10">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${stats.belem.coverage >= 80 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-blue-600'}`} 
                        style={{ width: `${Math.min(stats.belem.coverage, 100)}%` }}
                      ></div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 text-6xl opacity-[0.03] group-hover:scale-110 transition-transform">📊</div>
              </div>
          </div>

          {/* PAINEL BARCARENA (HABA) */}
          <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Unidade Barcarena (HABA)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <AdminStatCard label="Membros HABA" value={stats.barcarena.active} emoji="👥" color="from-indigo-50/50 to-indigo-100/50" />
                  <AdminStatCard label="Setores HABA" value={stats.barcarena.sectors} emoji="🏢" color="from-slate-50 to-slate-100" />
              </div>
              {/* BARRA DE PROGRESSO HABA */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-end mb-4 relative z-10">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Adesão Ministerial HABA</p>
                          <p className="text-[9px] font-bold text-indigo-600/60 uppercase">Meta Institucional: 80%</p>
                      </div>
                      <p className="text-3xl font-black text-indigo-600">{stats.barcarena.coverage.toFixed(1)}%</p>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex items-center px-1 relative z-10">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${stats.barcarena.coverage >= 80 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-indigo-600'}`} 
                        style={{ width: `${Math.min(stats.barcarena.coverage, 100)}%` }}
                      ></div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 text-6xl opacity-[0.03] group-hover:scale-110 transition-transform">📊</div>
              </div>
          </div>

      </div>

      {/* FOOTER INFORMATIVO */}
      <div className="bg-white/50 border border-slate-100 p-8 rounded-[3rem] flex flex-col items-center justify-center text-center gap-4">
           <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-50"><span className="text-4xl">🌎</span></div>
           <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Monitoramento Ministerial Híbrido</h3>
           <p className="text-xs text-slate-400 font-medium max-w-lg leading-relaxed italic">
             "O acompanhamento consolidado permite a visão do Reino, enquanto o detalhamento por unidade garante o cuidado individual em cada hospital."
           </p>
      </div>

    </div>
  );
};

const ExecutiveCard = ({ label, value, emoji, color }: any) => (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-blue-200 transition-all">
        <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-black/5 group-hover:scale-110 transition-transform`}>
            {emoji}
        </div>
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-2xl font-black text-slate-800 leading-none">{value}</p>
        </div>
    </div>
);

const AdminStatCard = ({ label, value, emoji, color }: any) => (
    <div className={`bg-gradient-to-br ${color} p-6 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 border border-white shadow-xl shadow-black/5 active:scale-95 transition-all h-full`}>
        <div className="text-3xl filter drop-shadow-md mb-1">{emoji}</div>
        <div className="text-center">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-3xl font-black text-slate-800 leading-none">{value}</p>
        </div>
    </div>
);

export default AdminDashboard;
