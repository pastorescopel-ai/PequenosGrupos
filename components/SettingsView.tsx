
import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, 
  CheckCircle,
  UploadCloud,
  PenTool,
  Loader2,
  Layout,
  Trash2,
  Palette
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { ReportSettings, UnitLayout } from '../types';
import VisualPageBuilder from './VisualPageBuilder';
import ConfirmModal from './ConfirmModal';

interface SettingsViewProps {
  settings: ReportSettings;
  onUpdate: (s: ReportSettings) => void;
}

const DEFAULT_LAYOUT: UnitLayout = {
    header: { x: 0, y: 0, w: 210, h: 45 },
    header_bg_color: '#ffffff',
    footer: { x: 0, y: 260, w: 210, h: 37 },
    signature: { x: 55, y: 218, w: 100, h: 12 }, 
    director_name_pos: { x: 55, y: 236, w: 100, h: 10 },
    director_title_pos: { x: 55, y: 243, w: 100, h: 8 },
    content_y: 50 
};

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdate }) => {
  const [localSettings, setLocalSettings] = useState<ReportSettings>({
      ...settings,
      layout: settings.layout || {
          belem: { ...DEFAULT_LAYOUT },
          barcarena: { ...DEFAULT_LAYOUT }
      }
  });
  const [activeUnitTab, setActiveUnitTab] = useState<'Belém' | 'Barcarena'>('Belém');
  const [isSaved, setIsSaved] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [fileToRemove, setFileToRemove] = useState<keyof ReportSettings | null>(null);

  useEffect(() => {
    if (settings) {
        setLocalSettings(prev => ({
            ...settings, 
            layout: settings.layout || prev.layout || {
                belem: { ...DEFAULT_LAYOUT },
                barcarena: { ...DEFAULT_LAYOUT }
            }
        }));
    }
  }, [settings]);

  const fileInputs = {
    template_belem_url: useRef<HTMLInputElement>(null),
    template_barcarena_url: useRef<HTMLInputElement>(null),
    footer_belem_url: useRef<HTMLInputElement>(null),
    footer_barcarena_url: useRef<HTMLInputElement>(null),
    signature_url: useRef<HTMLInputElement>(null)
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof ReportSettings, pathPrefix: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert("Apenas imagens são permitidas.");
        return;
    }

    setUploadingField(field as string);
    try {
      const storageRef = ref(storage, `settings/${pathPrefix}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setLocalSettings(prev => ({ ...prev, [field]: downloadURL }));
    } catch (error) {
      console.error("Erro upload:", error);
    } finally {
      setUploadingField(null);
    }
  };

  const handleConfirmRemoveFile = () => {
    if (fileToRemove) {
      setLocalSettings(prev => ({ ...prev, [fileToRemove]: '' }));
      setFileToRemove(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const currentLayout = activeUnitTab === 'Belém' ? localSettings.layout!.belem : localSettings.layout!.barcarena;

  const updateLayout = (newLayout: UnitLayout) => {
      setLocalSettings(prev => ({
          ...prev,
          layout: {
              ...prev.layout!,
              [activeUnitTab === 'Belém' ? 'belem' : 'barcarena']: newLayout
          }
      }));
  };

  const updateHeaderBg = (color: string) => {
    const key = activeUnitTab === 'Belém' ? 'belem' : 'barcarena';
    const updatedLayout = { ...localSettings.layout![key], header_bg_color: color };
    updateLayout(updatedLayout);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-32">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Arquitetura de Relatórios</h2>
          <p className="text-slate-500 font-medium">Configure a identidade visual oficial.</p>
        </div>
        {isSaved && (
          <div className="flex items-center gap-2 bg-green-100 text-green-700 px-6 py-3 rounded-2xl text-xs font-black animate-bounce shadow-sm">
            <CheckCircle size={18} /> CONFIGURAÇÕES SALVAS!
          </div>
        )}
      </header>

      <form onSubmit={handleSave} className="space-y-10">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3 uppercase tracking-tight">
                    <PenTool className="text-blue-600" /> Assinatura Ministerial
                </h3>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Diretor Espiritual</label>
                <input type="text" value={localSettings.director_name} onChange={e => setLocalSettings({...localSettings, director_name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Cargo</label>
                <input type="text" value={localSettings.director_title} onChange={e => setLocalSettings({...localSettings, director_title: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none" />
            </div>
            <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Arquivo de Assinatura (PNG)</label>
                <div className="mt-2 relative">
                    <div 
                        onClick={() => !localSettings.signature_url && fileInputs.signature_url.current?.click()} 
                        className={`border-2 border-dashed border-slate-200 rounded-[2rem] h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all bg-slate-50/30 ${localSettings.signature_url ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                        <input type="file" ref={fileInputs.signature_url} className="hidden" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleFileUpload(e, 'signature_url', 'signatures')} />
                        {uploadingField === 'signature_url' ? <Loader2 className="animate-spin text-blue-600" /> : 
                        localSettings.signature_url ? (
                            <img src={localSettings.signature_url} className="h-20 object-contain" alt="Assinatura" />
                        ) : (
                            <div className="text-center">
                                <UploadCloud className="text-slate-300 mx-auto mb-2" size={32} />
                                <p className="text-[10px] font-bold text-slate-400">UPLOAD ASSINATURA</p>
                            </div>
                        )}
                    </div>
                    {localSettings.signature_url && (
                        <button type="button" onClick={() => setFileToRemove('signature_url')} className="absolute top-2 right-2 p-2 bg-red-100 text-red-600 rounded-full shadow-sm hover:bg-red-200 transition-colors"><Trash2 size={16} /></button>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-white p-10 rounded-[4rem] border border-slate-200 shadow-sm space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4 uppercase tracking-tight">
                    <Layout className="text-blue-600" size={32}/> Engenharia Visual A4
                </h3>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
                    <button type="button" onClick={() => setActiveUnitTab('Belém')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeUnitTab === 'Belém' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Belém</button>
                    <button type="button" onClick={() => setActiveUnitTab('Barcarena')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeUnitTab === 'Barcarena' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Barcarena</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 space-y-6">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">Logo do Cabeçalho</label>
                        <div className="relative">
                            <div 
                                onClick={() => {
                                    const field = activeUnitTab === 'Belém' ? 'template_belem_url' : 'template_barcarena_url';
                                    if (!localSettings[field]) (activeUnitTab === 'Belém' ? fileInputs.template_belem_url : fileInputs.template_barcarena_url).current?.click();
                                }}
                                className={`p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-white hover:border-blue-400 transition-all text-center ${ (activeUnitTab === 'Belém' ? localSettings.template_belem_url : localSettings.template_barcarena_url) ? 'cursor-default bg-white border-blue-100' : 'cursor-pointer'}`}
                            >
                                <input type="file" ref={activeUnitTab === 'Belém' ? fileInputs.template_belem_url : fileInputs.template_barcarena_url} className="hidden" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleFileUpload(e, activeUnitTab === 'Belém' ? 'template_belem_url' : 'template_barcarena_url', 'headers')} />
                                {uploadingField?.includes('template') ? <Loader2 className="animate-spin text-blue-600 mx-auto" /> : 
                                (activeUnitTab === 'Belém' ? localSettings.template_belem_url : localSettings.template_barcarena_url) ? (
                                    <div className="space-y-2">
                                        <img src={activeUnitTab === 'Belém' ? localSettings.template_belem_url : localSettings.template_barcarena_url} className="h-16 mx-auto object-contain" alt="Header" />
                                        <p className="text-[9px] font-black text-green-600 uppercase">Logo Pronta</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <UploadCloud className="text-slate-300 mx-auto" />
                                        <p className="text-[9px] font-black text-slate-500 uppercase">Upload Logo {activeUnitTab}</p>
                                    </div>
                                )}
                            </div>
                            {(activeUnitTab === 'Belém' ? localSettings.template_belem_url : localSettings.template_barcarena_url) && (
                                <button type="button" onClick={() => setFileToRemove(activeUnitTab === 'Belém' ? 'template_belem_url' : 'template_barcarena_url')} className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-lg shadow-sm hover:bg-red-100 transition-colors"><Trash2 size={14} /></button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">Fundo do Cabeçalho</label>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            <Palette className="text-slate-400" size={20} />
                            <input type="color" value={currentLayout.header_bg_color || '#ffffff'} onChange={e => updateHeaderBg(e.target.value)} className="w-10 h-10 border-none bg-transparent cursor-pointer rounded-lg overflow-hidden" />
                            <input type="text" value={currentLayout.header_bg_color || '#ffffff'} onChange={e => updateHeaderBg(e.target.value)} className="flex-1 bg-transparent font-bold text-slate-800 outline-none uppercase text-sm" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">Rodapé</label>
                        <div className="relative">
                            <div 
                                onClick={() => {
                                    const field = activeUnitTab === 'Belém' ? 'footer_belem_url' : 'footer_barcarena_url';
                                    if (!localSettings[field]) (activeUnitTab === 'Belém' ? fileInputs.footer_belem_url : fileInputs.footer_barcarena_url).current?.click();
                                }}
                                className={`p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-white hover:border-blue-400 transition-all text-center ${ (activeUnitTab === 'Belém' ? localSettings.footer_belem_url : localSettings.footer_barcarena_url) ? 'cursor-default bg-white border-blue-100' : 'cursor-pointer'}`}
                            >
                                <input type="file" ref={activeUnitTab === 'Belém' ? fileInputs.footer_belem_url : fileInputs.footer_barcarena_url} className="hidden" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleFileUpload(e, activeUnitTab === 'Belém' ? 'footer_belem_url' : 'footer_barcarena_url', 'footers')} />
                                {uploadingField?.includes('footer') ? <Loader2 className="animate-spin text-blue-600 mx-auto" /> : 
                                (activeUnitTab === 'Belém' ? localSettings.footer_belem_url : localSettings.footer_barcarena_url) ? (
                                    <img src={activeUnitTab === 'Belém' ? localSettings.footer_belem_url : localSettings.footer_barcarena_url} className="h-16 mx-auto object-contain" alt="Footer" />
                                ) : (
                                    <div className="space-y-2">
                                        <UploadCloud className="text-slate-300 mx-auto" />
                                        <p className="text-[9px] font-black text-slate-500 uppercase">Upload Rodapé {activeUnitTab}</p>
                                    </div>
                                )}
                            </div>
                            {(activeUnitTab === 'Belém' ? localSettings.footer_belem_url : localSettings.footer_barcarena_url) && (
                                <button type="button" onClick={() => setFileToRemove(activeUnitTab === 'Belém' ? 'footer_belem_url' : 'footer_barcarena_url')} className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-lg shadow-sm hover:bg-red-100 transition-colors"><Trash2 size={14} /></button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <VisualPageBuilder 
                        layout={currentLayout} 
                        headerUrl={activeUnitTab === 'Belém' ? localSettings.template_belem_url : localSettings.template_barcarena_url}
                        footerUrl={activeUnitTab === 'Belém' ? localSettings.footer_belem_url : localSettings.footer_barcarena_url}
                        signatureUrl={localSettings.signature_url}
                        directorName={localSettings.director_name}
                        directorTitle={localSettings.director_title}
                        onChange={updateLayout}
                    />
                </div>
            </div>
        </div>

        <div className="flex justify-end pt-6">
          <button type="submit" className="px-16 py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase text-sm tracking-widest shadow-2xl hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-4">
            <Save size={20} /> Salvar Arquitetura Visual
          </button>
        </div>
      </form>

      {fileToRemove && (
        <ConfirmModal
          title="Remover Imagem?"
          description={<>Você está prestes a remover este arquivo das configurações. A alteração só será permanente após clicar em <b>Salvar Arquitetura Visual</b>.</>}
          onConfirm={handleConfirmRemoveFile}
          onCancel={() => setFileToRemove(null)}
          confirmText="Confirmar Remoção"
          variant="warning"
        />
      )}
    </div>
  );
};

export default SettingsView;
