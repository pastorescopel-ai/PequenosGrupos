
import React from 'react';
import { Info, Lightbulb } from 'lucide-react';

interface HelpNoteProps {
  text: string;
  type?: 'info' | 'tip' | 'warning';
  className?: string;
}

const HelpNote: React.FC<HelpNoteProps> = ({ text, type = 'tip', className = '' }) => {
  const styles = {
    tip: 'bg-blue-50 border-blue-200 text-blue-800',
    info: 'bg-slate-50 border-slate-200 text-slate-700',
    warning: 'bg-orange-50 border-orange-200 text-orange-800'
  };

  const Icons = {
    tip: <Lightbulb className="shrink-0" size={18} />,
    info: <Info className="shrink-0" size={18} />,
    warning: <Info className="shrink-0" size={18} />
  };

  return (
    <div className={`p-5 rounded-3xl border flex gap-4 items-start transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${styles[type]} ${className}`}>
      <div className={`p-2 rounded-xl bg-white/50 shadow-sm`}>
        {Icons[type]}
      </div>
      <p className="text-xs font-bold leading-relaxed pt-1">
        {text}
      </p>
    </div>
  );
};

export default HelpNote;
