
import React, { useState } from 'react';
import { 
  X, 
  ScanText, 
  ChevronRight,
  Clock,
  ChevronLeft,
  UserCog,
  Save,
  Building,
  IdCard,
  User
} from 'lucide-react';
import { Collaborator, InactivationReason, HospitalUnit } from '../types';
import HelpNote from './HelpNote';
import { ministerialInstructions } from '../instructions';
import { MOTIVOS_ALTERACAO } from '../constants';

interface CollaboratorDetailModalProps {
  collaborator: Collaborator;
  reasons: any[];
  onClose: () => void;
  onRequestAction: (type: 'add' | 'remove', reasonId: string, justification: string, inactivationReason?: InactivationReason) => void;
  isAdmin?: boolean;
  onUpdate?: (updatedData: Partial<Collaborator>) => void;
}

const CollaboratorDetailModal: React.FC<CollaboratorDetailModalProps> = ({ 
  collaborator, 
  onClose, 
  onRequestAction,
  isAdmin = false,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isAdminEditing, setIsAdminEditing] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [justification, setJustification] = useState('');
  
  // Admin Edit State
  const [editForm, setEditForm] = useState<Partial<Collaborator>>({
    full_name: collaborator.full_name,
    employee_id: collaborator.employee_id,
    sector_name: collaborator.sector_name,
    hospital: collaborator.hospital
  });

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestAction('remove', 'manual', justification, motivo as InactivationReason);
    onClose();
  };

  const handleAdminSave = (e: React.FormEvent) => {
    e.preventDefault();
    if(onUpdate) {
        onUpdate(editForm);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        
        <div className="flex justify-between items-center mb-8">
           {isEditing || isAdminEditing ? (
             <button onClick={() => { setIsEditing(false); setIsAdminEditing(false); }} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-[10px] uppercase transition-all">
               <ChevronLeft size={14}/> Voltar
             </button>
           ) : (
             <h3 className="text-xl font-black text-slate-800 tracking-tight">Prontuário de Membro</h3>
           )}
           <button onClick={onClose} className="text-slate-400 hover:text-slate-800 transition-colors hover:rotate-90"><X size={24}/></button>
        </div>

        {(!isEditing && !isAdminEditing) ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <HelpNote text={ministerialInstructions.members.selection} type="info" />
            
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 flex gap-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black shrink-0">
                {collaborator.full_name.charAt(0)}
              </div>
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
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full flex items-center justify-between p-6 rounded-[1.5rem] border border-slate-100 bg-white hover:border-blue-600 text-slate-700 shadow-sm transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <UserCog size={20}/>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.15em]">Solicitar Alteração / Saída</span>
                </div>
                <ChevronRight size={16} className="opacity-30 group-hover:opacity-100 transition-opacity" />
              </button>
              
              {isAdmin && (
                  <button 
                    onClick={() => setIsAdminEditing(true)}
                    className="w-full flex items-center justify-between p-6 rounded-[1.5rem] border border-slate-100 bg-white hover:border-orange-500 text-slate-700 shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all">
                        <Save size={20}/>
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-[0.15em]">Editar Dados (Admin)</span>
                    </div>
                    <ChevronRight size={16} className="opacity-30 group-hover:opacity-100 transition-opacity" />
                  </button>
              )}
            </div>
          </div>
        ) : isAdminEditing ? (
           <form onSubmit={handleAdminSave} className="space-y-6 animate-in slide-in-from-right-8 duration-300">
               <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl mb-4">
                   <p className="text-xs text-orange-800 font-bold">Modo de Edição Administrativa</p>
                   <p className="text-[10px] text-orange-600 mt-1">Alterações aqui impactam diretamente o cadastro.</p>
               </div>
               
               <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase px-2">Nome Completo</label>
                      <div className="relative">
                         <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                         <input required type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600" />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase px-2">Matrícula</label>
                      <div className="relative">
                         <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                         <input required type="text" value={editForm.employee_id} onChange={e => setEditForm({...editForm, employee_id: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600" />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase px-2">Setor</label>
                      <div className="relative">
                         <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                         <input required type="text" value={editForm.sector_name} onChange={e => setEditForm({...editForm, sector_name: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600" />
                      </div>
                   </div>
                   <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase px-2">Unidade</label>
                        <select value={editForm.hospital} onChange={e => setEditForm({...editForm, hospital: e.target.value as HospitalUnit})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none">
                            <option value="Belém">Belém</option>
                            <option value="Barcarena">Barcarena</option>
                        </select>
                   </div>
               </div>

               <button type="submit" className="w-full py-5 bg-orange-500 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-orange-600 active:scale-95 transition-all">
                  Salvar Dados
               </button>
           </form>
        ) : (
          <form onSubmit={handleActionSubmit} className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            <HelpNote text="Qualquer alteração requer análise ministerial da Capelania." type="tip" />
            
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Selecione o motivo</label>
                <select 
                  required 
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                >
                  <option value="">Escolha uma opção...</option>
                  {MOTIVOS_ALTERACAO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Justificativa</label>
                <textarea 
                  required 
                  value={justification} 
                  onChange={e => setJustification(e.target.value)} 
                  placeholder="escreva em poucas palavras quais motivos" 
                  className="w-full h-32 px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 resize-none transition-all"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 active:scale-95 transition-all">
              Confirmar Solicitação
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default CollaboratorDetailModal;
