
import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Upload, CheckCircle2, Image as ImageIcon, Info } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { Leader } from '../types';

interface MeetingRegistryModalProps {
  user: Leader;
  onClose: () => void;
  onSave: (data: { photo: string, description: string }) => void;
}

const MeetingRegistryModal: React.FC<MeetingRegistryModalProps> = ({ user, onClose, onSave }) => {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo || !description) return;

    setIsUploading(true);
    try {
        // Upload para Firebase Storage
        const storageRef = ref(storage, `pg_photos/${user.id}/${Date.now()}_${photo.name}`);
        const snapshot = await uploadBytes(storageRef, photo);
        const downloadURL = await getDownloadURL(snapshot.ref);

        onSave({ photo: downloadURL, description });
        onClose();
    } catch (error) {
        console.error("Erro no upload:", error);
        alert("Erro ao enviar foto. Tente novamente.");
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-blue-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[3.5rem] shadow-2xl p-10 overflow-y-auto animate-in zoom-in-95 duration-300 relative z-10 custom-scrollbar">
        
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-3xl font-black text-slate-800 flex items-center gap-4">
              <Camera className="text-blue-600" size={32}/> Registro de Reunião
            </h3>
            <p className="text-slate-500 font-medium mt-1">Evidência semanal para o Pequeno Grupo.</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-2xl transition-all group"
          >
            <X size={24} className="group-hover:rotate-90 transition-transform"/>
          </button>
        </div>

        <div className="bg-orange-50 border border-orange-100 p-6 rounded-[2rem] flex gap-5 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-orange-600 shrink-0">
             <Info size={24}/>
          </div>
          <div>
            <p className="text-sm font-black text-orange-900 leading-tight">Aviso do Projeto</p>
            <p className="text-xs text-orange-800/80 mt-1 font-medium leading-relaxed">
              Fotos de cultos diários ou plantões não serão validadas. Use este espaço <b>apenas</b> para a reunião semanal do PG.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div 
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`relative aspect-video rounded-[2.5rem] border-4 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden cursor-pointer ${
              preview ? 'border-blue-600' : 'border-slate-200 bg-slate-50 hover:border-blue-400'
            }`}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            
            {isUploading && !preview && (
               <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                 <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
               </div>
            )}

            {preview ? (
              <>
                <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-2">
                     <Upload size={18}/> Trocar Foto
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center group p-6">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                  <ImageIcon size={40}/>
                </div>
                <p className="font-black text-slate-800 uppercase text-xs tracking-widest">Selecionar Foto</p>
                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">Sua imagem será salva na nuvem</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Descrição da Reunião</label>
            <textarea 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Como foi a reunião? Quem estava presente?"
              className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-bold text-slate-800 outline-none focus:ring-8 focus:ring-blue-600/5 resize-none transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={!photo || !description || isUploading}
            className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isUploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Enviando para Nuvem...
              </>
            ) : (
              <>
                <CheckCircle2 size={20}/> Finalizar Registro
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default MeetingRegistryModal;
