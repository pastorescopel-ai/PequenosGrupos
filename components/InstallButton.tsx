
import React from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

interface InstallButtonProps {
    variant?: 'sidebar' | 'mobile';
}

const InstallButton: React.FC<InstallButtonProps> = ({ variant = 'sidebar' }) => {
  const { isInstallable, installApp } = usePWA();

  if (!isInstallable) return null;

  if (variant === 'mobile') {
      return (
        <button 
            onClick={installApp}
            className="flex flex-col items-center justify-center gap-1 w-full text-blue-600 animate-pulse"
        >
            <Download size={20} />
            <span className="text-[9px] font-black uppercase">Instalar</span>
        </button>
      );
  }

  return (
    <button 
      onClick={installApp}
      className="w-full mt-4 bg-blue-900 text-white p-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-blue-200 hover:bg-blue-800 transition-all active:scale-95 group"
    >
      <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
        <Smartphone size={20} />
      </div>
      <div className="text-left">
        <p className="text-[9px] font-black uppercase text-blue-300">Disponível</p>
        <p className="text-xs font-bold">Instalar App</p>
      </div>
    </button>
  );
};

export default InstallButton;
