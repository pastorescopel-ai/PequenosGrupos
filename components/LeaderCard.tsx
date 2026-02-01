
import React from 'react';
import { MessageCircle, Mail, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { Leader } from '../types';

interface LeaderCardProps {
  leader: Leader;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onSendInvite: (e: React.MouseEvent) => void;
}

const LeaderCard: React.FC<LeaderCardProps> = ({ leader, onSelect, onDelete, onSendInvite }) => {
  return (
    <div 
      onClick={onSelect}
      className={`p-8 rounded-[2.5rem] border shadow-sm cursor-pointer transition-all group relative flex flex-col justify-between ${leader.active ? 'bg-white border-slate-200 hover:border-blue-600 hover:z-10' : 'bg-slate-50 border-slate-100 opacity-75'}`}
    >
      <div>
        <div className="flex justify-between items-start mb-4">
           <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-black group-hover:bg-blue-600 group-hover:text-white transition-all">
              {leader.full_name.charAt(0)}
           </div>
           <button 
              onClick={onDelete}
              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all z-10 text-lg filter drop-shadow-sm hover:scale-110"
              title="Excluir cadastro"
           >
              🗑️
           </button>
        </div>

        <div className="min-w-0 mb-4">
          <p className="font-black text-slate-800 group-hover:text-blue-600 transition-colors truncate text-lg">{leader.full_name}</p>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{leader.sector_name}</p>
        </div>
      </div>

      <div>
        {leader.needs_password_change && (
          <button 
            onClick={onSendInvite}
            className="w-full mb-4 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 animate-pulse"
          >
             {leader.whatsapp ? <MessageCircle size={14}/> : <Mail size={14}/>}
             Enviar Convite de Acesso
          </button>
        )}

        <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
           {leader.needs_password_change ? (
             <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                <Clock size={12} />
                <span className="text-[9px] font-black uppercase tracking-wide">Aguardando Senha</span>
             </div>
           ) : (
             <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                <CheckCircle2 size={12} />
                <span className="text-[9px] font-black uppercase tracking-wide">Conta Ativa</span>
             </div>
           )}
           <div className="ml-auto text-slate-300 group-hover:text-blue-600 transition-colors">
              <ChevronRight size={18} />
           </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderCard;
