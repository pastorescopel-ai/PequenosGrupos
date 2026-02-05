import React, { useState, useMemo, useEffect } from 'react';
import { Search, Users, ChevronLeft, AlertCircle, Clock } from 'lucide-react';
import { Leader, ChangeRequest, Collaborator, PG, Sector } from '../../types';
import LeaderMemberView from './LeaderMemberView';

interface AdminMemberViewProps {
  user: Leader;
  memberRequests: ChangeRequest[];
  members: Collaborator[];
  allCollaborators: Collaborator[];
  pgs: PG[];
  leaders: Leader[];
  sectors: Sector[];
  onAddRequest: (req: ChangeRequest, pgName?: string) => void;
  onRequestAction: (id: string, status: 'approved' | 'rejected', request: ChangeRequest) => Promise<void>;
  initialPGId?: string | null;
  onClearPGId?: () => void;
}

const AdminMemberView: React.FC<AdminMemberViewProps> = ({ 
  user, memberRequests, members, pgs, leaders, sectors, onAddRequest, onRequestAction, allCollaborators, initialPGId, onClearPGId 
}) => {
  const [pgSearch, setPgSearch] = useState('');
  const [selectedPG, setSelectedPG] = useState<PG | null>(null);

  // Efeito de Deep Linking: Se vier um ID/Nome de PG inicial, seleciona ele automaticamente.
  useEffect(() => {
      if (initialPGId) {
          const pg = pgs.find(p => p.name === initialPGId);
          if (pg) {
              setSelectedPG(pg);
              // Limpa o ID inicial para não re-selecionar ao voltar da tela
              if (onClearPGId) onClearPGId();
          }
      }
  }, [initialPGId, pgs, onClearPGId]);

  const pgCardsData = useMemo(() => {
    const pgsWithStats = pgs.map(pg => {
      const pgLeader = leaders.find(l => l.pg_name === pg.name && l.active);
      const countMembers = members.filter(m => (m as any).pg_name === pg.name && m.active !== false).length;
      
      // Conta quantas solicitações pendentes existem para este PG
      const pendingCount = memberRequests.filter(r => 
        r.status === 'pending' && 
        leaders.find(l => l.id === r.leader_id)?.pg_name === pg.name
      ).length;
      
      return {
        ...pg,
        leaderName: pgLeader ? pgLeader.full_name : 'Sem Líder Definido',
        memberCount: countMembers + (pgLeader ? 1 : 0),
        pendingCount
      };
    });

    return pgsWithStats
      .filter(p => p.active && (!pgSearch || p.name.toLowerCase().includes(pgSearch.toLowerCase()) || p.leaderName.toLowerCase().includes(pgSearch.toLowerCase())))
      .sort((a, b) => {
        // PGs com pendências sempre no topo
        if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
        return a.name.localeCompare(b.name);
      });
  }, [pgs, leaders, members, memberRequests, pgSearch]);

  if (selectedPG) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedPG(null)} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-[10px] uppercase tracking-widest transition-colors"><ChevronLeft size={14}/> Retornar à lista de PGs</button>
        <LeaderMemberView 
          user={user} 
          adminForcedPG={selectedPG.name} 
          members={members} 
          allCollaborators={allCollaborators} 
          pgs={pgs} 
          leaders={leaders} 
          sectors={sectors} 
          onAddRequest={onAddRequest}
          memberRequests={memberRequests} 
          onRequestAction={onRequestAction}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 text-left">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Gestão por PGs</h2>
                <p className="text-slate-500 font-medium">Selecione um grupo para gerenciar seus membros e aprovar pendências.</p>
            </div>
            <div className="relative w-full md:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                <input type="text" placeholder="Buscar PG ou Líder..." value={pgSearch} onChange={(e) => setPgSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-3xl font-bold text-slate-800 outline-none focus:border-blue-600 shadow-sm" />
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pgCardsData.map(pg => (
                <div key={pg.id} onClick={() => setSelectedPG(pg)} className={`bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden ${pg.pendingCount > 0 ? 'border-orange-400 ring-4 ring-orange-500/5' : 'border-slate-100'}`}>
                    {pg.pendingCount > 0 && (
                        <div className="absolute top-4 right-4 flex items-center gap-1 bg-orange-600 text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase animate-pulse shadow-lg">
                            <AlertCircle size={10}/> {pg.pendingCount} Pendência
                        </div>
                    )}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-all mb-4 ${pg.pendingCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                        {pg.name.charAt(0)}
                    </div>
                    <h3 className="font-black text-slate-800 text-lg mb-1">{pg.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{pg.leaderName}</p>
                    <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-500 flex items-center gap-2"><Users size={14} className="text-blue-400"/> {pg.memberCount} Integrantes</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default AdminMemberView;