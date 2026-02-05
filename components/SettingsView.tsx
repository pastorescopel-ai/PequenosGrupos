
import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, 
  CheckCircle,
  Loader2,
  Palette,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { doc, setDoc, writeBatch, getDocs, collection } from 'firebase/firestore';
import { db } from '../lib/firebase'; 
import { ReportSettings, UnitLayout, Sector, Collaborator } from '../types';
import VisualPageBuilder from './VisualPageBuilder';
import ConfirmModal from './ConfirmModal';

interface SettingsViewProps {
  settings: ReportSettings;
  onUpdate: (s: ReportSettings) => void;
  sectors?: Sector[];
  allCollaborators?: Collaborator[];
}

// Ajuste Fino: Assinatura Y aumentado para 224 (era 218) para ficar mais perto do nome (Y=236)
const DEFAULT_LAYOUT: UnitLayout = {
    header: { x: 0, y: 0, w: 210, h: 45 },
    header_bg_color: '#ffffff',
    footer: { x: 0, y: 260, w: 210, h: 37 },
    signature: { x: 55, y: 224, w: 100, h: 12 }, 
    director_name_pos: { x: 55, y: 236, w: 100, h: 10 },
    director_title_pos: { x: 55, y: 243, w: 100, h: 8 },
    content_y: 50 
};

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdate, sectors = [], allCollaborators = [] }) => {
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

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

  const executeDeepCleanup = async () => {
    setShowCleanupConfirm(false);
    setIsProcessing(true);

    try {
        // Recarregar setores direto do banco para garantir que não estamos usando cache
        const allSectorsSnap = await getDocs(collection(db, "sectors"));
        const currentSectors = allSectorsSnap.docs.map(d => d.data() as Sector);

        let batch = writeBatch(db);
        let batchCount = 0;
        let fixedCollabs = 0;
        let deletedSectors = 0;

        // 1. CORRIGIR NOMES NOS COLABORADORES
        // Varre todos os colaboradores e tenta encontrar um setor "Oficial" para eles
        for (const collab of allCollaborators) {
            // Tenta achar o setor oficial pelo ID numérico (ex: "22") que corresponde ao ID antigo (ex: "22_HAB...")
            // Ou pelo Code direto
            const officialSector = currentSectors.find(s => 
                s.code === collab.sector_id || 
                s.id === collab.sector_id ||
                // Fallback: Tenta extrair o código numérico do ID antigo do colaborador
                (collab.sector_id && s.code === collab.sector_id.split('_')[0])
            );
            
            // Se achou um oficial e o nome está diferente, atualiza
            if (officialSector && collab.sector_name !== officialSector.name) {
                const collabRef = doc(db, "collaborators", collab.id);
                batch.update(collabRef, { 
                    sector_name: officialSector.name,
                    sector_id: officialSector.code // Força o ID para o novo padrão também
                });
                fixedCollabs++;
                batchCount++;
            }

            if (batchCount >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
            }
        }

        // 2. DELETAR SETORES "SUJOS"
        // Padrão antigo: NUMERO + (HAB ou HABA) + NOME (com underscores ou hifens)
        // Padrão novo: Apenas o CÓDIGO (ex: "22") ou um UUID limpo
        const dirtyRegex = /^(\d+)[-_ ]*(HAB|HABA)[-_ ]+/i;

        for (const secDoc of allSectorsSnap.docs) {
            const secId = secDoc.id;
            
            // Se o ID bate com o padrão antigo (Ex: "22_HAB_CAPELANIA")
            if (dirtyRegex.test(secId)) {
                batch.delete(secDoc.ref);
                deletedSectors++;
                batchCount++;
                console.log(`Marcado para deleção: ${secId}`);
            }

            if (batchCount >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
            }
        }

        if (batchCount > 0) await batch.commit();

        alert(`Limpeza Concluída!\n\n- Colaboradores Corrigidos: ${fixedCollabs}\n- Setores Antigos Removidos: ${deletedSectors}\n\nO banco de dados agora deve mostrar apenas os setores unificados.`);

    } catch (error) {
        console.error("Erro na limpeza:", error);
        alert("Erro técnico durante a higienização. Verifique o console.");
    } finally {
        setIsProcessing(false);
    }
  };

  // Função mágica para resolver o CORS: Converte imagem para Base64 comprimido
  const processImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Redimensionar para evitar documentos gigantes no Firestore (Max 800px largura)
                const scale = Math.min(1, 800 / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Comprime para JPEG 70% para economizar espaço
                const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                resolve(canvas.toDataURL(format, 0.7));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
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
      const base64String = await processImageToBase64(file);
      setLocalSettings(prev => ({ ...prev, [field]: base64String }));
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      alert("Erro ao processar a imagem. Tente uma imagem menor.");
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await setDoc(doc(db, "settings", "global"), localSettings);
        onUpdate(localSettings);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar configurações.");
    }
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
          <h2 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Configurações Gerais</h2>
          <p className="text-slate-500 font-medium">Parâmetros do sistema e relatórios.</p>
        </div>
        {isSaved && (
          <div className="flex items-center gap-2 bg-green-100 text-green-700 px-6 py-3 rounded-2xl text-xs font-black animate-bounce shadow-sm">
            <CheckCircle size={18} /> SALVO!
          </div>
        )}
      </header>

      {/* ZONA DE MANUTENÇÃO - LIMPEZA DE DUPLICIDADES */}
      <div className="bg-orange-50 p-8 rounded-[3rem] border border-orange-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
         <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-orange-600 border border-orange-100 shadow-sm">
                <ShieldAlert size={24} />
            </div>
            <div>
                <h4 className="text-lg font-black text-slate-800 tracking-tight">Manutenção de Banco de Dados</h4>
                <p className="text-xs text-orange-800 font-medium mt-1 leading-relaxed max-w-md">
                    Detecta setores duplicados (ex: "22_HAB_CAPELANIA"), move funcionários para o oficial ("CAPELANIA") e limpa o lixo.
                </p>
            </div>
         </div>
         <button 
            onClick={() => setShowCleanupConfirm(true)}
            disabled={isProcessing}
            className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-700 shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
         >
            {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16} />} 
            {isProcessing ? 'Processando...' : 'Forçar Unificação'}
         </button>
      </div>

      <div className="bg-slate-100 h-px w-full my-4"></div>

      <div className="flex items-center gap-2 mb-2">
         <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Arquitetura de Relatórios</h3>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-800 text-xs font-medium mb-6">
         <strong>Atenção:</strong> Se estiver tendo problemas com a geração de PDF, reenvie as imagens (Logo, Assinatura) abaixo.
      </div>

      <form onSubmit={handleSave} className="space-y-10">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3 uppercase tracking-tight">
                    <span className="text-2xl filter drop-shadow-sm">✒️</span> Assinatura Ministerial
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
                                <span className="text-3xl filter drop-shadow-sm opacity-50">☁️</span>
                                <p className="text-[10px] font-bold text-slate-400 mt-2">UPLOAD ASSINATURA</p>
                            </div>
                        )}
                    </div>
                    {localSettings.signature_url && (
                        <button type="button" onClick={() => setFileToRemove('signature_url')} className="absolute top-2 right-2 p-2 bg-red-100 text-red-600 rounded-full shadow-sm hover:bg-red-200 transition-colors"><span className="text-sm">🗑️</span></button>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-white p-10 rounded-[4rem] border border-slate-200 shadow-sm space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4 uppercase tracking-tight">
                    <span className="text-3xl filter drop-shadow-sm">📐</span> Engenharia Visual A4
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
                                        <span className="text-3xl filter drop-shadow-sm opacity-50">☁️</span>
                                        <p className="text-[9px] font-black text-slate-500 uppercase">Upload Logo {activeUnitTab}</p>
                                    </div>
                                )}
                            </div>
                            {(activeUnitTab === 'Belém' ? localSettings.template_belem_url : localSettings.template_barcarena_url) && (
                                <button type="button" onClick={() => setFileToRemove(activeUnitTab === 'Belém' ? 'template_belem_url' : 'template_barcarena_url')} className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-lg shadow-sm hover:bg-red-100 transition-colors"><span className="text-sm">🗑️</span></button>
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
                                        <span className="text-3xl filter drop-shadow-sm opacity-50">☁️</span>
                                        <p className="text-[9px] font-black text-slate-500 uppercase">Upload Rodapé {activeUnitTab}</p>
                                    </div>
                                )}
                            </div>
                            {(activeUnitTab === 'Belém' ? localSettings.footer_belem_url : localSettings.footer_barcarena_url) && (
                                <button type="button" onClick={() => setFileToRemove(activeUnitTab === 'Belém' ? 'footer_belem_url' : 'footer_barcarena_url')} className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-lg shadow-sm hover:bg-red-100 transition-colors"><span className="text-sm">🗑️</span></button>
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

      {showCleanupConfirm && (
        <ConfirmModal
            title="Manutenção de Banco de Dados"
            description={<>Isso irá varrer <b>todos os colaboradores</b> e atualizar os nomes dos setores para o padrão oficial, além de <b>DELETAR</b> setores duplicados antigos (Ex: '22_HAB_UTI').<br/><br/>Esta ação é irreversível.</>}
            onConfirm={executeDeepCleanup}
            onCancel={() => setShowCleanupConfirm(false)}
            confirmText="Iniciar Reparação"
            variant="warning"
            icon={<ShieldAlert size={40} />}
        />
      )}
    </div>
  );
};

export default SettingsView;
