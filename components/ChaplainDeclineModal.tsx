
import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

interface ChaplainDeclineModalProps {
  onClose: () => void;
  onConfirm: (reason: string, message: string) => void;
  leaderName?: string;
}

const ChaplainDeclineModal: React.FC<ChaplainDeclineModalProps> = ({ onClose, onConfirm, leaderName }) => {
  const [declineReason, setDeclineReason] = useState('');
  const [declineMessage, setDeclineMessage] = useState('Infelizmente não teremos disponibilidade para esta data específica devido a compromissos pré-agendados. No entanto, gostaríamos muito de participar do seu próximo encontro! Por favor, nos informe a data da sua próxima reunião para priorizarmos sua escala.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(declineReason, declineMessage);
  };

  return (
    <div className="fixed inset-0 bg-red-950/90 backdrop-blur-xl z-[400] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 shadow-2xl">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h4 className="text-2xl font-black text-slate-800 tracking-tight">Recusar Pedido</h4>
              <p className="text-slate-500 text-sm font-medium">O motivo aparecerá no histórico do {leaderName}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-800"><X size={24}/></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Categoria do Motivo</label>
              <select required value={declineReason} onChange={e => setDeclineReason(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                <option value="">Selecione...</option>
                <option value="Conflito de Agenda">Conflito de Agenda Pastoral</option>
                <option value="Plantão Hospitalar">Plantão Hospitalar Emergencial</option>
                <option value="Indisponibilidade Técnica">Indisponibilidade Técnica</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mensagem Propositiva (Visível ao Líder)</label>
              <textarea required value={declineMessage} onChange={e => setDeclineMessage(e.target.value)} className="w-full h-40 p-5 bg-slate-50 border border-slate-200 rounded-[2rem] font-medium text-sm text-slate-700 resize-none outline-none focus:ring-4 focus:ring-red-600/5"/>
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={onClose} className="flex-1 py-5 border border-slate-200 text-slate-500 font-black uppercase text-[10px] rounded-2xl">Voltar</button>
              <button type="submit" className="flex-1 py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                <Send size={16}/> Registrar e Enviar
              </button>
            </div>
          </form>
        </div>
    </div>
  );
};

export default ChaplainDeclineModal;
