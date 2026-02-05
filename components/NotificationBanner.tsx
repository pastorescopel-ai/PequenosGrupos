
import React, { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { requestNotificationPermission } from '../lib/notifications';
import { Leader } from '../types';

interface NotificationBannerProps {
  user: Leader;
  onUpdateUser: (data: Partial<Leader>) => Promise<void>;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ user, onUpdateUser }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === 'default' && !user.browser_notifications_enabled) {
        setIsVisible(true);
      }
    }
  }, [user.browser_notifications_enabled]);

  const handleActivate = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      await onUpdateUser({ browser_notifications_enabled: true });
      setIsVisible(false);
    } else {
      alert("A permissão foi negada. Verifique as configurações do navegador.");
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="mb-8 animate-in slide-in-from-top-4 duration-500 text-left">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
        <div className="absolute -right-10 -top-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
           <span className="text-[180px] select-none">🔔</span>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 text-center md:text-left">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center animate-bounce">
              <span className="text-3xl">🔔</span>
            </div>
            <div>
              <h4 className="text-xl font-black tracking-tight">Ativar Alertas do Sistema?</h4>
              <p className="text-blue-100 text-sm font-medium mt-1">Receba avisos de novos convites e confirmações pastorais em tempo real.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={handleActivate}
              className="flex-1 md:flex-none bg-white text-blue-700 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-blue-50 transition-all shadow-xl active:scale-95"
            >
              🔔 Sim, quero receber alertas <ChevronRight size={16} />
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-4 bg-black/10 hover:bg-black/20 rounded-2xl text-white/70 transition-colors"
              title="Lembrar mais tarde"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationBanner;
