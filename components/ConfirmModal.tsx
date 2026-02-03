
import React from 'react';
import { AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  description: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'success' | 'warning';
  icon?: React.ReactNode;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  title, 
  description, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar', 
  variant = 'danger',
  icon
}) => {
  const styles = {
    danger: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      btn: 'bg-red-600 hover:bg-red-700 shadow-red-100',
      iconDefault: <AlertTriangle size={36} />
    },
    success: {
      bg: 'bg-green-50',
      text: 'text-green-600',
      btn: 'bg-green-600 hover:bg-green-700 shadow-green-100',
      iconDefault: <CheckCircle2 size={36} />
    },
    warning: {
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      btn: 'bg-orange-600 hover:bg-orange-700 shadow-orange-100',
      iconDefault: <AlertTriangle size={36} />
    }
  };

  const currentStyle = styles[variant];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
         <div className="flex flex-col items-center text-center">
            <div className={`w-20 h-20 ${currentStyle.bg} ${currentStyle.text} rounded-3xl flex items-center justify-center mb-6 shadow-sm`}>
               {icon || currentStyle.iconDefault}
            </div>
            
            <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">{title}</h3>
            <div className="text-slate-500 font-medium text-sm mb-8 leading-relaxed max-w-xs">
               {description}
            </div>

            <div className="flex gap-4 w-full">
               <button onClick={onCancel} className="flex-1 py-4 text-slate-500 font-bold bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                 {cancelText}
               </button>
               <button onClick={onConfirm} className={`flex-1 py-4 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${currentStyle.btn}`}>
                  {variant === 'danger' && <Trash2 size={16}/>} {confirmText}
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
