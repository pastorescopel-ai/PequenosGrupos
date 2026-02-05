
import React, { useState, useRef, useMemo } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PG, HospitalUnit } from '../types';
import { Upload, CheckCircle2, ChevronLeft, ChevronRight, Database, Trash2, Edit3, PlusCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';

interface ImportPGsProps {
  pgs: PG[]; 
  setPgs: React.Dispatch<React.SetStateAction<PG[]>>;
  defaultUnit: HospitalUnit;
}

interface PGPreview {
    id: string;
    name: string;
    unit: HospitalUnit;
    status: 'new' | 'updated' | 'inactivated' | 'unchanged' | 'wrong_unit';
    rawObj?: any;
}

const ImportPGs: React.FC<ImportPGsProps> = ({ pgs, setPgs, defaultUnit }) => {
  const [pasteData, setPasteData] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<PGPreview[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const stats = useMemo(() => {
    return {
      new: previewData.filter(i => i.status === 'new').length,
      updated: previewData.filter(i => i.status === 'updated').length,
      inactivated: previewData.filter(i => i.status === 'inactivated').length,
      total: previewData.filter(i => i.status !== 'wrong_unit').length
    };
  }, [previewData]);

  const handleAnalyze = async (dataToProcess: string) => {
    if (!dataToProcess.trim()) return;
    setIsAnalyzing(true);
    setPreviewData([]);
    
    try {
        const allRows = dataToProcess.split('\n').map(l => l.trim()).filter(l => l !== "");
        
        // V40/41: SALTO DE CABEÇALHO
        const dataRows = allRows.slice(1);
        
        const presentPgIds = new Set<string>();
        const reportList: PGPreview[] = [];

        for (const row of dataRows) {
            const parts = row.includes(';') ? row.split(';') : row.split('\t');
            if (parts.length < 2) continue;

            const idRaw = parts[0]?.trim() || '';
            const pgName = parts[1]?.trim() || '';
            const unidadeRaw = parts[2]?.trim().toLowerCase();
            
            // V40: FILTRO DE INTEGRIDADE
            if (!idRaw || !pgName) continue;

            let unit: HospitalUnit = defaultUnit;
            if (unidadeRaw) {
                if (unidadeRaw.includes('barcarena') || unidadeRaw.includes('haba')) unit = 'Barcarena';
                else if (unidadeRaw.includes('belem') || unidadeRaw.includes('hab')) unit = 'Belém';
            }

            if (unit !== defaultUnit) continue;

            const finalId = idRaw; // V40: ID IDÊNTICO À PLANILHA
            presentPgIds.add(finalId);

            const existing = pgs.find(p => p.id === finalId);
            let status: PGPreview['status'] = existing ? 'unchanged' : 'new';
            
            if (existing && (!existing.active || existing.name !== pgName)) {
                status = 'updated';
            }
            
            reportList.push({
                id: finalId, 
                name: pgName, 
                unit, 
                status,
                rawObj: { id: finalId, name: pgName, hospital: unit, active: true }
            });
        }

        // INATIVAÇÃO ESTRITA
        const toInactivate = pgs.filter(p => 
            p.active && 
            (p.hospital === defaultUnit || (!p.hospital && defaultUnit === 'Belém')) && 
            !presentPgIds.has(p.id)
        );

        toInactivate.forEach(p => {
            reportList.push({
                id: p.id, name: p.name, unit: p.hospital || 'Belém', status: 'inactivated'
            });
        });

        // V41: ORDENAÇÃO POR PRIORIDADE (Inativados primeiro)
        const sortedList = reportList.sort((a, b) => {
            if (a.status === 'inactivated' && b.status !== 'inactivated') return -1;
            if (a.status !== 'inactivated' && b.status === 'inactivated') return 1;
            return a.name.localeCompare(b.name);
        });

        setPreviewData(sortedList);
        setShowPreview(true);
        setCurrentPage(1);
    } catch (e) { alert("Erro na análise da planilha."); } 
    finally { setIsAnalyzing(false); }
  };

  const handleConfirmSave = async () => {
      setIsSaving(true);
      try {
          const batchSize = 400; 
          let batch = writeBatch(db!);
          let opCount = 0;

          const toSave = previewData.filter(i => (i.status === 'new' || i.status === 'updated') && i.rawObj);
          for (const item of toSave) {
              const docRef = doc(db!, "pgs", item.id); // V40: ID ESTÁVEL
              batch.set(docRef, item.rawObj, { merge: true });
              opCount++;
              if (opCount >= batchSize) { await batch.commit(); batch = writeBatch(db!); opCount = 0; }
          }

          const toInactivate = previewData.filter(i => i.status === 'inactivated');
          for (const item of toInactivate) {
              const docRef = doc(db!, "pgs", item.id);
              batch.update(docRef, { active: false });
              opCount++;
              if (opCount >= batchSize) { await batch.commit(); batch = writeBatch(db!); opCount = 0; }
          }

          if (opCount > 0) await batch.commit();
          alert("PGs atualizados com sucesso!");
          setShowPreview(false);
          setPasteData('');
      } catch (e) { alert("Erro ao salvar no Firestore."); } 
      finally { setIsSaving(false); }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = previewData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(previewData.length / itemsPerPage);

  return (
    <div className="space-y-8 text-left">
      <div className="bg-indigo-50/50 p-8 rounded-[3rem] border-2 border-indigo-100 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-indigo-700">
               <div className="p-3 bg-white rounded-2xl shadow-sm"><FileSpreadsheet size={24} /></div>
               <div><h4 className="text-xl font-black">Importar PGs</h4><p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{defaultUnit}</p></div>
            </div>
            <div className="bg-white/70 p-5 rounded-[2rem] border border-indigo-100 space-y-3">
                <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">Integridade V41:</p>
                <ul className="text-[11px] text-slate-500 font-medium space-y-1.5 leading-tight">
                    <li>• Inativações priorizadas no topo.</li>
                    <li>• Paginação intuitiva para grandes listas.</li>
                    <li>• O ID da planilha será mantido fielmente.</li>
                </ul>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="w-full p-6 border-4 border-dashed border-indigo-200 rounded-[2.5rem] bg-white hover:bg-indigo-50 transition-all flex flex-col items-center gap-2">
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => handleAnalyze(ev.target?.result as string);
                        reader.readAsText(file);
                    }
                }}/>
                <Upload size={28} className="text-indigo-400" />
                <span className="font-black text-[10px] uppercase text-indigo-600">Escolher Planilha</span>
            </button>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-4">
              <textarea className="w-full flex-1 h-48 p-6 rounded-[2rem] border-2 border-indigo-100 outline-none font-mono text-xs resize-none bg-white shadow-inner focus:border-indigo-400 transition-colors" placeholder="Cole os dados aqui (Incluindo o cabeçalho)..." value={pasteData} onChange={e => setPasteData(e.target.value)} />
              <button onClick={() => handleAnalyze(pasteData)} disabled={isAnalyzing || !pasteData.trim()} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3">
                {isAnalyzing ? <><RefreshCw size={18} className="animate-spin"/> Analisando...</> : 'Processar e Contar'}
              </button>
          </div>
      </div>

      {showPreview && (
          <div className="animate-in slide-in-from-bottom-10 duration-500 pb-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatCard label="Novos PGs" value={stats.new} icon={<PlusCircle size={16}/>} color="bg-green-50 text-green-700 border-green-100" />
                  <StatCard label="Atualizar" value={stats.updated} icon={<Edit3 size={16}/>} color="bg-blue-50 text-blue-700 border-blue-100" />
                  <StatCard label="Inativar" value={stats.inactivated} icon={<Trash2 size={16}/>} color="bg-red-50 text-red-700 border-red-100" />
                  <StatCard label="Total Válido" value={stats.total} icon={<Database size={16}/>} color="bg-slate-50 text-slate-700 border-slate-200" />
              </div>

              <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm mb-8">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                          <tr><th className="p-6">Status</th><th className="p-6">ID Planilha</th><th className="p-6">Nome do PG</th><th className="p-6">Unidade</th></tr>
                      </thead>
                      <tbody className="text-xs font-medium text-slate-600">
                          {currentItems.map((item) => (
                              <tr key={item.id} className={`border-b border-slate-50 last:border-0 ${item.status === 'inactivated' ? 'bg-red-50/40' : ''}`}>
                                  <td className="p-6">
                                      {item.status === 'new' ? <span className="text-green-600 font-black">NOVO</span> :
                                       item.status === 'updated' ? <span className="text-blue-600 font-black">ATUALIZAR</span> :
                                       item.status === 'inactivated' ? <span className="text-red-600 font-black">INATIVAR</span> : 
                                       <span className="text-slate-400">SEM ALTERAÇÃO</span>}
                                  </td>
                                  <td className="p-6 font-mono font-bold text-indigo-600">{item.id}</td>
                                  <td className="p-6 font-bold">{item.name}</td>
                                  <td className="p-6">{item.unit}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {totalPages > 1 && (
                      <div className="bg-slate-50 p-6 flex items-center justify-between border-t border-slate-100">
                          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"><ChevronLeft size={20}/></button>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Página {currentPage} de {totalPages}</span>
                          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"><ChevronRight size={20}/></button>
                      </div>
                  )}
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-4">
                  <button onClick={() => setShowPreview(false)} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl">Descartar Análise</button>
                  <button onClick={handleConfirmSave} disabled={isSaving} className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3">
                      {isSaving ? <><RefreshCw size={18} className="animate-spin"/> Gravando...</> : `Confirmar Sincronização de ${stats.total} Itens`}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => (
    <div className={`p-5 rounded-2xl border flex flex-col gap-1 ${color} shadow-sm`}>
        <div className="flex items-center gap-2 opacity-70">
            {icon}
            <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-2xl font-black">{value}</span>
    </div>
);

export default ImportPGs;
