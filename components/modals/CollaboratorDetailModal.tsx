import React, { useState, useEffect, useRef } from 'react';
import { X, ScanText, ChevronRight, Clock, ChevronLeft, UserCog, Save, Check, XCircle } from 'lucide-react';
import { Collaborator, InactivationReason, HospitalUnit, Sector, ChangeRequest } from '../../types';
import HelpNote from '../HelpNote';
import { ministerialInstructions } from '../../instructions';
import { MOTIVOS_ALTERACAO } from '../../constants';

interface CollaboratorDetailModalProps {
  collaborator: Collaborator;
  reasons: any[];
  onClose: () => void;
  onRequestAction: (type: 'add' | 'remove', reasonId: string, justification: string, inactivationReason?: InactivationReason) => void;
  isAdmin?: boolean;
  onUpdate?: (updatedData: Partial<Collaborator>) => void;
  sectors?: Sector[];
  pendingRequest?: ChangeRequest | null;
  onDecision?: (status: 'approved' | 'rejected') => Promise<void>;
}

const CollaboratorDetailModal: React.FC<CollaboratorDetailModalProps> = ({ 
  collaborator, onClose, onRequestAction, isAdmin = false, onUpdate, sectors = [], pendingRequest, onDecision
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isAdminEditing, setIsAdminEditing] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [justification, setJustification] = useState('');
  
  const [editForm, setEditForm] = useState<Partial<Collaborator>>({
    full_name: collaborator.full_name,
    employee_id: collaborator.employee_id,
    sector_name: collaborator.sector_name,
    hospital: collaborator.hospital
  });

  const [sectorSearch, setSectorSearch] = useState(collaborator.sector_name || '');
  const [showSectorResults, setShowSectorResults] = useState(false);
  const [sectorResults, setSectorResults] = useState<Sector[]>([]);
  const sectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (sectorRef.current && !sectorRef.current.contains(event.target as Node)) {
              setShowSectorResults(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
      if (isAdminEditing && sectorSearch) {
          const lower = sectorSearch.toLowerCase();
          const filtered = sectors.filter(s => 
              (s.hospital === editForm.hospital || !s.hospital) &&
              (s.name.toLowerCase().includes(lower) || s.code.toLowerCase().includes(lower))
          ).slice(0, 5);
          setSectorResults(filtered);
          setShowSectorResults(true);
      } else {
          setShowSectorResults(false);
      }
  }, [sectorSearch, editForm.hospital, sectors, isAdminEditing]);

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestAction('remove', 'manual', justification, motivo as InactivationReason);
    onClose();
  };

  const handleAdminSave = (e: React.FormEvent) => {
    e.preventDefault();
    if(onUpdate) {
        onUpdate({ ...editForm, sector_name: sectorSearch });
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 text-left">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        
        <div className="flex justify-between items-center mb-8">
           {isEditing || isAdminEditing ? (
             <button onClick={() => { setIsEditing(false); setIsAdminEditing(false); }} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-[10px] uppercase transition-all">
               <ChevronLeft size={14}/> Voltar
             </button>
           ) : (
             <h3 className="text-xl font-black text-slate-800 tracking-tight">{pendingRequest ? 'Análise Ministerial' : 'Prontuário de Membro'}</h3>
           )}
           <button onClick={onClose} className="text-slate-400 hover:text-slate-800 transition-colors"><X size={24}/></button>
        </div>

        {pendingRequest ? (
          <div className="space-y-6">
            <div className="bg-orange-50 border-2 border-orange-100 rounded-[2rem] p-6 space-y-4">
                <div className="flex items-center gap-3 text-orange-700">
                    <Clock size={20} className="animate-pulse" />
                    <p className="font-black uppercase text-[11px] tracking-widest">Solicitação Pendente</p>
                </div>
                
                <div className="flex gap-4 items-center bg-white p-4 rounded-2xl shadow-sm">
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-black">{pendingRequest.collaborator_name?.charAt(0)}</div>
                    <div>
                        <p className="font-black text-slate-800 text-sm">{pendingRequest.collaborator_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RH: {pendingRequest.collaborator_sector}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Solicitado por:</p>
                        <p className="text-xs font-bold text-slate-700">{pendingRequest.leader_name}</p>
                    </div>
                    <div className="p-4 bg-white/50 border border-orange-100 rounded-xl italic">
                        <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Justificativa:</p>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed">"{pendingRequest.admin_notes || 'Não detalhada.'}"</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => onDecision?.('rejected')} 
                    className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                >
                    <XCircle size={16}/> Recusar
                </button>
                <button 
                    onClick={() => onDecision?.('approved')} 
                    className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                >
                    <Check size={16}/> Aprovar Vínculo
                </button>
            </div>
          </div>
        ) : (!isEditing && !isAdminEditing) ? (
          <div className="space-y-6">
            <HelpNote text={ministerialInstructions.members.selection} type="info" />
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 flex gap-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black shrink-0">{collaborator.full_name.charAt(0)}</div>
              <div className="min-w-0">
                <p className="text-lg font-black text-slate-800 truncate">{collaborator.full_name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{collaborator.sector_name}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><ScanText size={12}/> {collaborator.employee_id}</span>
                  <span className="flex items-center gap-1.5"><Clock size={12}/> Desde {collaborator.join_date}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button onClick={() => setIsEditing(true)} className="w-full flex items-center justify-between p-6 rounded-[1.5rem] border border-slate-100 bg-white hover:border-blue-600 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><UserCog size={20}/></div>
                  <span className="text-[11px] font-black uppercase tracking-[0.15em]">Solicitar Alteração / Saída</span>
                </div>
                <ChevronRight size={16} className="opacity-30" />
              </button>
              {isAdmin && (
                  <button onClick={() => setIsAdminEditing(true)} className="w-full flex items-center justify-between p-6 rounded-[1.5rem] border border-slate-100 bg-white hover:border-orange-500 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all"><Save size={20}/></div>
                      <span className="text-[11px] font-black uppercase tracking-[0.15em]">Editar Dados (Admin)</span>
                    </div>
                    <ChevronRight size={16} className="opacity-30" />
                  </button>
              )}
            </div>
          </div>
        ) : isAdminEditing ? (
           <form onSubmit={handleAdminSave} className="space-y-6">
               <div className="space-y-4">
                   <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase px-2">Nome Completo</label><input required type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase px-2">Matrícula</label><input required type="text" value={editForm.employee_id} onChange={e => setEditForm({...editForm, employee_id: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" /></div>
                   <div className="space-y-1" ref={sectorRef}><label className="text-[9px] font-black text-slate-400 uppercase px-2">Setor</label><input required type="text" value={sectorSearch} onChange={e => setSectorSearch(e.target.value)} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />{showSectorResults && (<div className="bg-white border border-slate-200 rounded-xl mt-2 overflow-hidden shadow-lg">{sectorResults.map(s => <button key={s.id} onClick={() => { setSectorSearch(s.name); setShowSectorResults(false); }} className="w-full p-3 text-left hover:bg-slate-50 text-xs font-bold">{s.name}</button>)}</div>)}</div>
               </div>
               <button type="submit" className="w-full py-5 bg-orange-500 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl">Salvar Dados</button>
           </form>
        ) : (
          <form onSubmit={handleActionSubmit} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Selecione o motivo</label><select required value={motivo} onChange={e => setMotivo(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none"><option value="">Escolha uma opção...</option>{MOTIVOS_ALTERACAO.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Justificativa</label><textarea required value={justification} onChange={e => setJustification(e.target.value)} placeholder="Descreva os motivos..." className="w-full h-32 px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none resize-none" /></div>
            </div>
            <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl">Confirmar Solicitação</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CollaboratorDetailModal;