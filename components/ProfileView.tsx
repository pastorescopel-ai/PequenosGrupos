
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Loader2, BellRing, BellOff } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { Leader } from '../types';
import { requestNotificationPermission } from '../lib/notifications';

interface ProfileViewProps {
  user: Leader;
  onUpdate: (updatedData: Partial<Leader>) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    employee_id: user.employee_id,
    sector_name: user.sector_name || '',
    whatsapp: user.whatsapp || '',
    photo_url: user.photo_url || '',
    browser_notifications_enabled: user.browser_notifications_enabled || false
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData({
      full_name: user.full_name,
      employee_id: user.employee_id,
      sector_name: user.sector_name || '',
      whatsapp: user.whatsapp || '',
      photo_url: user.photo_url || '',
      browser_notifications_enabled: user.browser_notifications_enabled || false
    });
  }, [user]);

  const handleToggleNotifications = async () => {
    const isCurrentlyEnabled = formData.browser_notifications_enabled;
    
    if (!isCurrentlyEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setFormData(prev => ({ ...prev, browser_notifications_enabled: true }));
        onUpdate({ browser_notifications_enabled: true });
      } else {
        alert("Permissão de notificação negada pelo navegador. Verifique as configurações do site.");
      }
    } else {
      setFormData(prev => ({ ...prev, browser_notifications_enabled: false }));
      onUpdate({ browser_notifications_enabled: false });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    setFormData({ ...formData, whatsapp: v });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        const storageRef = ref(storage, `avatars/${user.id}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        setFormData(prev => ({ ...prev, photo_url: downloadURL }));
        onUpdate({ photo_url: downloadURL });
      } catch (err) {
        alert("Erro ao enviar imagem para a nuvem.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        full_name: formData.full_name,
        employee_id: formData.employee_id,
        sector_name: formData.sector_name,
        whatsapp: formData.whatsapp,
        photo_url: formData.photo_url,
        browser_notifications_enabled: formData.browser_notifications_enabled,
        needs_password_change: false 
      });
      alert("Perfil atualizado com sucesso!");
    } catch (e) {
      alert("Erro ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500 pb-20 text-left">
      <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl relative">
        
        <div className="bg-blue-700 h-40 relative">
          <div className="absolute -bottom-16 left-12">
            <div 
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className="group relative w-32 h-32 rounded-[2.5rem] bg-white border-8 border-white shadow-2xl flex items-center justify-center text-blue-700 text-5xl font-black uppercase overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
            >
              <input type="file" ref={fileInputRef} onChange={handlePhotoChange} className="hidden" accept="image/*" />
              {isProcessing ? (
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : formData.photo_url ? (
                <img src={formData.photo_url} className="w-full h-full object-cover" alt="Perfil" />
              ) : (
                formData.full_name.charAt(0)
              )}
              <div className="absolute inset-0 bg-blue-900/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white" size={24} />
                <span className="text-[8px] text-white font-black uppercase mt-1 tracking-widest">Alterar</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-24 pb-12 px-12">
          <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">Dados do Perfil</h2>
              <div className="flex gap-3 mt-4">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${isAdmin ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {isAdmin ? 'Administrador' : 'Líder de PG'}
                </span>
                <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                  Hospital Adventista de {user.hospital}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className={`p-6 rounded-3xl border transition-all ${isAdmin ? 'bg-white border-slate-200 focus-within:ring-4 focus-within:ring-blue-600/5 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-70'}`}>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nome Completo (Exibição)</label>
              <div className="flex items-center gap-3">
                <span className="text-2xl filter drop-shadow-sm">👤</span>
                {isAdmin ? (
                  <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-transparent font-black text-slate-800 outline-none" placeholder="Seu nome" />
                ) : (
                  <><span className="font-black text-slate-800 truncate">{formData.full_name}</span><span className="ml-auto text-lg grayscale opacity-50">🔒</span></>
                )}
              </div>
            </div>

            <div className={`p-6 rounded-3xl border transition-all ${isAdmin ? 'bg-white border-slate-200 focus-within:ring-4 focus-within:ring-blue-600/5 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-70'}`}>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Matrícula / ID</label>
              <div className="flex items-center gap-3">
                <span className="text-2xl filter drop-shadow-sm">💳</span>
                {isAdmin ? (
                  <input type="text" value={formData.employee_id} onChange={e => setFormData({...formData, employee_id: e.target.value})} className="w-full bg-transparent font-black text-slate-800 outline-none" placeholder="Matrícula" />
                ) : (
                  <><span className="font-black text-slate-800">{formData.employee_id}</span><span className="ml-auto text-lg grayscale opacity-50">🔒</span></>
                )}
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm focus-within:ring-4 focus-within:ring-blue-600/5 transition-all">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">WhatsApp</label>
              <div className="flex items-center gap-3">
                <span className="text-2xl filter drop-shadow-sm">📱</span>
                <input type="tel" value={formData.whatsapp} onChange={handlePhoneChange} placeholder="(91) 99999-9999" maxLength={15} className="w-full bg-transparent font-black text-slate-800 outline-none" />
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm focus-within:ring-4 focus-within:ring-blue-600/5 transition-all">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Setor de Atuação</label>
              <div className="flex items-center gap-3">
                <span className="text-2xl filter drop-shadow-sm">🏢</span>
                <input type="text" value={formData.sector_name} onChange={e => setFormData({...formData, sector_name: e.target.value})} className="w-full bg-transparent font-black text-slate-800 outline-none" placeholder="Seu setor" />
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-100">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-8 flex items-center gap-3"><span className="text-3xl filter drop-shadow-sm">🔔</span> Notificações</h3>
            <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 mb-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${formData.browser_notifications_enabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                  {formData.browser_notifications_enabled ? <BellRing size={28} /> : <BellOff size={28} />}
                </div>
                <div>
                  <h4 className="font-black text-slate-800">Alertas do Navegador</h4>
                  <p className="text-slate-500 text-xs font-medium max-w-xs">Receba avisos de novos convites e confirmações mesmo fora da aba do sistema.</p>
                </div>
              </div>
              <button 
                onClick={handleToggleNotifications}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  formData.browser_notifications_enabled 
                  ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' 
                  : 'bg-blue-600 text-white shadow-xl shadow-blue-100 hover:bg-blue-700'
                }`}
              >
                {formData.browser_notifications_enabled ? 'Desativar Alertas' : 'Ativar Alertas'}
              </button>
            </div>

            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-8 flex items-center gap-3"><span className="text-3xl filter drop-shadow-sm">🛡️</span> Segurança</h3>
            <button 
              onClick={handleSave} 
              disabled={isProcessing || isSaving}
              className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <span className="text-xl">💾</span>}
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
