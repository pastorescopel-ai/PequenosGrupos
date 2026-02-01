
import React from 'react';
import { ScanText, Mail, Phone } from 'lucide-react';
import { Chaplain } from '../types';
import ActionTooltip from './ActionTooltip';

interface ChaplainCardProps {
  chaplain: Chaplain;
  onEdit: (chaplain: Chaplain) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string, name: string) => void;
}

const ChaplainCard: React.FC<ChaplainCardProps> = ({ chaplain, onEdit, onToggle, onRemove }) => {
  return (
    <div className={`bg-white p-8 rounded-[2.5rem] border shadow-sm group hover:border-blue-600 hover:z-20 relative transition-all ${chaplain.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
          {chaplain.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-800 group-hover:text-blue-600 transition-colors truncate">{chaplain.name}</p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
            <ScanText size={12} /> {chaplain.employee_id}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        {chaplain.email && (
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <Mail size={12} className="text-slate-300" />
            <span className="truncate">{chaplain.email}</span>
          </div>
        )}
        {chaplain.whatsapp && (
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <Phone size={12} className="text-slate-300" />
            <span>{chaplain.whatsapp}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${chaplain.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {chaplain.active ? 'Ativo' : 'Inativo'}
        </span>
        <div className="flex gap-1">
          <ActionTooltip content="Editar Dados do Capelão">
            <button
              onClick={() => onEdit(chaplain)}
              className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all text-lg filter drop-shadow-sm hover:scale-110"
            >
              ✏️
            </button>
          </ActionTooltip>

          <ActionTooltip content={chaplain.active ? "Inativar da escala" : "Ativar na escala"}>
            <button
              onClick={() => onToggle(chaplain.id)}
              className={`p-2 rounded-xl transition-all text-lg filter drop-shadow-sm hover:scale-110`}
            >
              {chaplain.active ? '🔴' : '🟢'}
            </button>
          </ActionTooltip>

          <ActionTooltip content="Excluir Definitivamente">
            <button
              onClick={() => onRemove(chaplain.id, chaplain.name)}
              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all text-lg filter drop-shadow-sm hover:scale-110"
            >
              🗑️
            </button>
          </ActionTooltip>
        </div>
      </div>
    </div>
  );
};

export default ChaplainCard;
