
import React from 'react';
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
            <span className="text-2xl filter drop-shadow-sm">📲</span>
            <span className="text-[9px] font-black uppercase">Instalar</span>
        </button>
      );
  }

  return (
    <button 
      onClick={installApp}
      className="w-full mt-4 bg-blue-900 text-white p-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-blue-200 hover:bg-blue-800 transition-all active:scale-95 group"
    >
      <div className="text-2xl filter drop-shadow-md group-hover:scale-110 transition-transform">
        📲
      </div>
      <div className="text-left">
        <p className="text-[9px] font-black uppercase text-blue-300">Disponível</p>
        <p className="text-xs font-bold">Instalar App</p>
      </div>
    </button>
  );
};

export default InstallButton;
