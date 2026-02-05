
import React, { useState, useRef } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Collaborator, HospitalUnit, Sector } from '../types';
import { Upload, FileText, CheckCircle2, RefreshCw, Wand2, ChevronLeft, ChevronRight, XCircle, UserPlus, ShieldAlert } from 'lucide-react';

interface ImportBaseCollaboratorsProps {
  allCollaborators: Collaborator[]; 
  setAllCollaborators: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  sectors: Sector[]; 
  defaultUnit: HospitalUnit;
}

interface PreviewItem {
  id: string;
  name: string;
  sector: string;
  unit: string;
  currentPg?: string;
  status: 'new' | 'updated' | 'inactivated' | 'unchanged' | 'corrected' | 'wrong_unit';
  details?: string;
  rawObj?: Collaborator;
}

/**
 * @shield_v23_import_base
 * Componente com trava estrita por unidade hospitalar.
 */
const ImportBaseCollaborators: React.FC<ImportBaseCollaboratorsProps> = ({ allCollaborators, setAllCollaborators, sectors = [], defaultUnit }) => {
  const [pasteData, setPasteData] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewItem[]>([]);
  const [inactivationList, setInactivationList] = useState<Collaborator[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async (dataToProcess: string) => {
    if (!dataToProcess.trim()) return;
    setIsAnalyzing(true);
    setPreviewData([]);
    
    try {
      const rows = dataToProcess.split('\n').filter(l => l.trim());
      const presentIds = new Set<string>(); 
      const reportList: PreviewItem[] = [];

      rows.forEach(row => {
        const parts = row.includes(';') ? row.split(';') : row.split('\t'); 
        if (parts.length < 2) return;

        const matricula = parts[0]?.trim() || '';
        const nome = parts[1]?.trim().toUpperCase() || '';
        const idSetor = parts[2]?.trim() || '';
        let nomeSetor = parts[3]?.trim() || 'GERAL';
        const unidadeRaw = parts[4]?.trim().toLowerCase();

        // BLINDAGEM: Determina Unidade e Valida se pertence ao contexto atual
        let targetUnit: HospitalUnit = defaultUnit;
        if (unidadeRaw) {
            if (unidadeRaw.includes('barcarena') || unidadeRaw.includes('haba')) targetUnit = 'Barcarena';
            else if (unidadeRaw.includes('belem') || unidadeRaw.includes('hab')) targetUnit = 'Belém';
        }

        const existing = allCollaborators.find(c => c.employee_id === matricula);
        let status: PreviewItem['status'] = existing ? 'unchanged' : 'new';
        let details = '';

        // TRAVA ESTRITA (SHIELD): Bloqueia se a unidade não bater com o selecionado no header
        if (targetUnit !== defaultUnit) {
            status = 'wrong_unit';
            details = `Ignorado: Registro pertence a ${targetUnit}.`;
        } else {
            // Normalização de Setores Duplicados
            if (idSetor && sectors.length > 0) {
                const officialSector = sectors.find(s => s.code === idSetor || s.id === idSetor);
                if (officialSector && nomeSetor !== officialSector.name) {
                    status = 'corrected';
                    details = `Setor normalizado para oficial.`;
                    nomeSetor = officialSector.name;
                }
            }

            if (existing && !existing.active) { status = 'updated'; details = 'Reativação.'; }
            else if (existing && existing.sector_name !== nomeSetor) { status = 'updated'; details = 'Mudança Setor.'; }

            if (matricula && nome) {
                presentIds.add(matricula);
                reportList.push({
                    id: matricula, name: nome, sector: nomeSetor, unit: targetUnit, 
                    currentPg: existing?.pg_name || '---', status, details,
                    rawObj: { id: matricula, employee_id: matricula, full_name: nome, sector_id: idSetor, sector_name: nomeSetor, active: true, hospital: targetUnit, pg_name: existing?.pg_name } as any
                });
            }
        }
      });

      // IDENTIFICAR INATIVADOS APENAS DA UNIDADE ALVO (SHIELD)
      const toInactivate = allCollaborators.filter(c => 
          c.active && 
          (c.hospital === defaultUnit || (!c.hospital && defaultUnit === 'Belém')) &&
          !presentIds.has(c.employee_id)
      );
      
      setInactivationList(toInactivate);
      toInactivate.forEach(c => {
          reportList.push({ id: c.employee_id, name: c.full_name, sector: c.sector_name, unit: c.hospital || 'Belém', status: 'inactivated', details: 'Removido da base oficial.' });
      });

      setPreviewData(reportList.sort((a, b) => a.name.localeCompare(b.name)));
      setShowPreview(true);
      setCurrentPage(1);
    } catch (e) { alert("Análise falhou."); } 
    finally { setIsAnalyzing(false); }
  };

  const handleConfirmSave = async () => {
      if (!db) return;
      setIsSaving(true);
      try {
          const batchSize = 400; 
          let batch = writeBatch(db);
          let opCount = 0;

          // 1. Salvar registros válidos (SHIELD: wront_unit já filtrado aqui)
          const toSave = previewData.filter(i => i.status !== 'inactivated' && i.status !== 'unchanged' && i.status !== 'wrong_unit' && i.rawObj);
          for (const item of toSave) {
              if (item.rawObj) {
                  batch.set(doc(db, "collaborators", item.rawObj.employee_id), item.rawObj, { merge: true });
                  opCount++;
                  if (opCount >= batchSize) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
              }
          }

          // 2. Inativações seguras
          for (const collab of inactivationList) {
              batch.update(doc(db, "collaborators", collab.employee_id), { active: false });
              opCount++;
              if (opCount >= batchSize) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
          }

          if (opCount > 0) await batch.commit();
          alert("Sincronização estrita concluída!");
          setShowPreview(false);
          setPasteData('');
      } catch (e) { alert("Erro ao gravar."); } 
      finally { setIsSaving(false); }
  };

  const renderStatusBadge = (status: PreviewItem['status']) => {
      switch(status) {
          case 'inactivated': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Inativar</span>;
          case 'wrong_unit': return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Pular Unidade</span>;
          case 'new': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Novo</span>;
          case 'corrected': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Corrigido</span>;
          default: return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">Manter</span>;
      }
  };

  return (
    <div className="space-y-10 text-left">
      <div className="bg-blue-50/50 p-10 rounded-[3rem] border-2 border-blue-100 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center gap-3 text-blue-800"><FileText size={24}/><h4 className="text-xl font-black">Base RH Estrita: {defaultUnit}</h4></div>
          <p className="text-xs text-slate-500 font-medium">SHIELD ATIVO: Registros de outras unidades serão barrados.</p>
          <button onClick={() => fileInputRef.current?.click()} className="w-full p-8 border-4 border-dashed border-blue-200 rounded-[2.5rem] bg-white flex flex-col items-center gap-3">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onload=(ev)=>handleAnalyze(ev.target?.result as string); r.readAsText(f); } }}/>
            <Upload size={32} className="text-blue-400" /><span className="font-black text-[11px] uppercase text-blue-600">Carregar Planilha</span>
          </button>
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4">
           <textarea className="w-full flex-1 h-[250px] p-8 rounded-[2.5rem] border-2 border-blue-100 outline-none font-mono text-xs resize-none bg-white" placeholder="Matrícula; Nome; Unidade..." value={pasteData} onChange={e => setPasteData(e.target.value)} />
           <button onClick={() => handleAnalyze(pasteData)} disabled={isAnalyzing} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">{isAnalyzing ? 'Processando Blindagem...' : 'Analisar Dados'}</button>
        </div>
      </div>

      {showPreview && (
          <div className="animate-in slide-in-from-bottom-10 fade-in duration-500 pb-10">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm mb-8 overflow-x-auto">
                  <table className="w-full text-left"><thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black"><tr><th className="p-6">Status</th><th className="p-6">Colaborador</th><th className="p-6">Setor</th><th className="p-6">Vínculo</th></tr></thead>
                  <tbody className="text-xs font-medium">
                      {previewData.slice((currentPage-1)*10, currentPage*10).map((item) => (
                          <tr key={item.id} className={`border-b border-slate-50 ${item.status === 'wrong_unit' ? 'bg-orange-50/20' : ''}`}><td className="p-6">{renderStatusBadge(item.status)}</td><td className="p-6"><b>{item.name}</b><br/>{item.id}</td><td className="p-6">{item.sector}</td><td className="p-6">{item.currentPg}</td></tr>
                      ))}
                  </tbody></table>
              </div>
              <div className="flex justify-end gap-4">
                  <button onClick={() => setShowPreview(false)} className="px-8 py-4 text-slate-500 font-bold">Cancelar</button>
                  <button onClick={handleConfirmSave} disabled={isSaving} className="px-10 py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Confirmar Gravação Estrita</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default ImportBaseCollaborators;
