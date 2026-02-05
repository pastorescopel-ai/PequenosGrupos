
import React, { useState } from 'react';
import { Check, X, Clock, User, Users, Briefcase, MessageSquare, AlertCircle, History, Search, RotateCcw, AlertTriangle } from 'lucide-react';
import { ChangeRequest, Leader, Sector } from '../types';
import { useMemberActions } from '../hooks/useMemberLogic';
import ConfirmModal from './ConfirmModal';

interface PendingRequestsViewProps {
  memberRequests: ChangeRequest[];
  leaders: Leader[];
  sectors: Sector[];
  onRequestAction: (id: string, status: 'approved' | 'rejected', request: ChangeRequest, refusalReason?: string) => Promise<void>;
}

const PendingRequestsView: React.FC<PendingRequestsViewProps> = ({ 
  memberRequests, leaders, sectors, onRequestAction 
}) => {
  const [activeView, setActiveView] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUndoing, setIsUndoing] = useState<string | null>(null);
  const [requestToUndo, setRequestToUndo] = useState<ChangeRequest | null>(null);
  const [requestToReject, setRequestToReject] = useState<ChangeRequest | null>(null);
  const [refusalReason, setRefusalReason] = useState('');

  const { handleUndoMemberAction } = useMemberActions({} as any, leaders);

  const pending = memberRequests
    .filter(r => r.status === 'pending')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const history = memberRequests
    .filter(r => r.status !== 'pending' && (
        (r.collaborator_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.leader_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    ))
    .sort((a, b) => new Date(b.processed_at || b.created_at).getTime() - new Date(a.processed_at || a.created_at).getTime());

  const getLeaderData = (leaderId: string) => leaders.find(l => l.id === leaderId);

  const executeUndo = async () => {
    if (!requestToUndo) return;
    const req = requestToUndo;
    setRequestToUndo(null);
    setIsUndoing(req.id);
    try {
        await handleUndoMemberAction(req);
    } catch (e) {
        alert("Erro ao desfazer ação.");
    } finally {
        setIsUndoing(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!requestToReject || !refusalReason.trim()) {
        alert("Informe o motivo da recusa.");
        return;
    }
    const req = requestToReject;
    const reason = refusalReason;
    setRequestToReject(null);
    setRefusalReason('');
    
    try {
        await onRequestAction(req.id, 'rejected', req, reason);
    } catch (e) {
        alert("Erro ao processar recusa.");
    }
  };

  const renderCard = (req: ChangeRequest, isHistory: boolean = false) => {
    const targetLeader = getLeaderData(req.leader_id);
    const isExternal = req.collaborator_id.startsWith('EXT-');
    const isCrossSector = targetLeader && req.collaborator_sector !== targetLeader.sector_name;
    const destinationPG = req.target_pg_name || targetLeader?.pg_name || 'PG Indefinido';

    return (
      <div key={req.id} className={`bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden transition-all group ${isHistory ? 'opacity-90 hover:opacity-100' : 'hover:shadow-md'}`}>
        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 p-8 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/30">
            <div className="flex items-start gap-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm border ${isExternal ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-blue-600 text-white border-blue-500'}`}>
                {req.collaborator_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-black text-xl text-slate-800 leading-tight truncate">{req.collaborator_name}</p>
                  {isExternal ? (
                    <span className="bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">Prestador</span>
                  ) : isCrossSector ? (
                    <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">Setor Diferente</span>
                  ) : null}
                  {isHistory && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {req.status === 'approved' ? 'Aprovado' : 'Recusado'}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-tight">
                    <Briefcase size={14} className="text-slate-300" /> 
                    Setor RH: <span className="text-slate-700">{req.collaborator_sector}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold">
                    <AlertCircle size={12} /> ID: {req.collaborator_id}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-5 bg-white rounded-2xl border border-slate-100 shadow-inner text-left">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <MessageSquare size={12} /> Justificativa do Líder
              </p>
              <p className="text-xs font-medium text-slate-600 italic leading-relaxed">"{req.admin_notes || 'Sem justificativa detalhada.'}"</p>
              
              {isHistory && req.status === 'rejected' && req.refusal_reason && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Motivo da Recusa (Feedback):</p>
                    <p className="text-xs font-bold text-red-600 italic">"{req.refusal_reason}"</p>
                  </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-80 p-8 flex flex-col justify-between bg-white text-left">
            <div className="space-y-6">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Destino Ministerial</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Users size={16}/></div>
                    <p className="text-sm font-black text-slate-800">{destinationPG}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center"><User size={16}/></div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{req.leader_name}</p>
                  </div>
                </div>
              </div>
            </div>

            {!isHistory ? (
              <div className="mt-8 grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setRequestToReject(req)}
                  className="py-3.5 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <X size={14}/> Recusar
                </button>
                <button 
                  onClick={() => onRequestAction(req.id, 'approved', req)}
                  className="py-3.5 bg-green-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-100 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check size={14}/> Aprovar
                </button>
              </div>
            ) : (
              <div className="mt-8 space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Processado por:</p>
                    <p className="text-[10px] font-black text-slate-700">{(req as any).processed_by || 'Administrador'}</p>
                    <p className="text-[8px] font-bold text-slate-400 mt-1">{(req as any).processed_at ? new Date((req as any).processed_at).toLocaleString() : ''}</p>
                </div>
                <button 
                    disabled={isUndoing === req.id}
                    onClick={() => setRequestToUndo(req)}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    <RotateCcw size={14} className={isUndoing === req.id ? 'animate-spin' : ''} />
                    {isUndoing === req.id ? 'Revertendo...' : 'Desfazer Decisão'}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="bg-slate-50/50 px-8 py-3 flex justify-between items-center border-t border-slate-100">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Solicitado em: {new Date(req.created_at).toLocaleString()}</span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Motivo: {req.reason_category}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 text-left">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Gestão de Vínculos</h2>
          <p className="text-slate-500 font-medium">Controle ministerial de entradas e transferências entre grupos.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] shadow-inner">
          <button 
            onClick={() => setActiveView('pending')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
          >
            <Clock size={14}/> Pendentes
            {pending.length > 0 && <span className="bg-blue-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{pending.length}</span>}
          </button>
          <button 
            onClick={() => setActiveView('history')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
          >
            <History size={14}/> Histórico
          </button>
        </div>
      </header>

      {activeView === 'history' && (
        <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20}/>
            <input 
              type="text" 
              placeholder="Buscar no histórico por nome do colaborador ou líder..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-3xl font-bold text-slate-700 outline-none shadow-sm focus:border-blue-600 transition-all"
            />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 pb-20">
        {activeView === 'pending' ? (
          pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-6"><Clock size={40} /></div>
              <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">Tudo em dia!</h3>
            </div>
          ) : (
            pending.map(req => renderCard(req))
          )
        ) : (
          history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-6"><History size={40} /></div>
              <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">Sem histórico</h3>
            </div>
          ) : (
            history.map(req => renderCard(req, true))
          )
        )}
      </div>

      {requestToUndo && (
          <ConfirmModal 
            title="Reverter Decisão?"
            description={<>Deseja desfazer a decisão para <b>{requestToUndo.collaborator_name}</b>? A solicitação voltará para a aba de Pendentes e o vínculo será restaurado ao estado anterior.</>}
            onConfirm={executeUndo}
            onCancel={() => setRequestToUndo(null)}
            confirmText="Sim, Reverter"
            variant="warning"
            icon={<RotateCcw size={40} className="text-orange-600" />}
          />
      )}

      {requestToReject && (
          <div className="fixed inset-0 bg-red-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
                  <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-red-100">
                          <AlertTriangle size={40} />
                      </div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">Justifique a Recusa</h3>
                      <p className="text-slate-500 text-sm font-medium mt-1">Este feedback será enviado ao líder do PG.</p>
                  </div>

                  <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Colaborador:</p>
                          <p className="text-xs font-bold text-slate-700">{requestToReject.collaborator_name}</p>
                      </div>
                      <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Motivo Interno / Orientação:</label>
                          <textarea 
                              required
                              autoFocus
                              value={refusalReason}
                              onChange={e => setRefusalReason(e.target.value)}
                              placeholder="Ex: Matrícula incorreta. Este colaborador já pertence ao PG de outro turno..."
                              className="w-full h-32 p-5 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-red-600/5 focus:border-red-600 transition-all resize-none"
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-8">
                      <button onClick={() => setRequestToReject(null)} className="py-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">Cancelar</button>
                      <button onClick={handleConfirmReject} className="py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all">Confirmar Recusa</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PendingRequestsView;
