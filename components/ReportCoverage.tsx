
import React, { useState, useMemo } from 'react';
import { Loader2, Calendar } from 'lucide-react';
// @ts-ignore
import saveAs from 'file-saver';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';

import { Leader, ReportSettings, HospitalUnit, Sector, Collaborator, UnitLayout, PGMeetingPhoto } from '../types';
import { GLOBAL_BRAND_LOGO, REPORT_SPECIFIC_LOGO } from '../assets_base64';

interface ReportCoverageProps {
  isAdmin: boolean;
  user: Leader;
  settings: ReportSettings;
  sectors: Sector[];
  members: Collaborator[];
  allCollaborators: Collaborator[];
  leaders: Leader[];
  photos?: PGMeetingPhoto[];
}

interface ResolvedAssets {
  header: { data: string, ratio: number };
  signature: { data: string, ratio: number } | null;
  footer: string | null;
}

const ReportCoverage: React.FC<ReportCoverageProps> = ({ isAdmin, user, settings, sectors, members, allCollaborators, leaders = [] }) => {
  const [selectedUnit, setSelectedUnit] = useState<HospitalUnit>(user.hospital);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [renderItems, setReportItemsToRender] = useState<any[]>([]);
  
  // Filtros de Período
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAssetAsBase64 = async (url: string | undefined, fallback: string): Promise<{ data: string, ratio: number }> => {
    if (!url) return { data: fallback, ratio: 2.5 };
    try {
      const response = await fetch(`${url}?t=${Date.now()}`, { mode: 'cors' });
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const img = new Image();
          img.onload = () => resolve({ data: base64data, ratio: img.width / img.height });
          img.src = base64data;
        };
        reader.readAsDataURL(blob);
      });
    } catch (e) { return { data: fallback, ratio: 2.5 }; }
  };

  const reportItems = useMemo(() => {
    const targetSectors = isAdmin 
        ? sectors.filter(s => s.hospital === selectedUnit || !s.hospital)
        : sectors.filter(s => s.hospital === user.hospital || !s.hospital);

    const items = targetSectors.map(sector => {
        const sectorMembers = members.filter(m => m.sector_name === sector.name && m.active !== false);
        const sectorLeaders = leaders.filter(l => l.sector_name === sector.name && l.active);
        const uniqueMatriculas = new Set([...sectorMembers.map(m => m.employee_id), ...sectorLeaders.map(l => l.employee_id)]);
        const sectorRH = allCollaborators.filter(c => c.sector_name === sector.name && c.active);
        const denominator = sectorRH.length || 1;
        return { 
          id: sector.id, 
          code: sector.code, 
          name: sector.name, 
          denominator, 
          numerator: uniqueMatriculas.size, 
          coverage_percent: (uniqueMatriculas.size / denominator) * 100 
        };
    });
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [sectors, members, allCollaborators, leaders, selectedUnit, isAdmin]);

  const drawMasterFrame = (pdf: any, layout: UnitLayout, resolved: ResolvedAssets) => {
    pdf.setFillColor(layout.header_bg_color || '#ffffff');
    pdf.rect(layout.header.x, layout.header.y, layout.header.w, layout.header.h, 'F');
    pdf.addImage(resolved.header.data, 'PNG', layout.header.x + 5, layout.header.y + 5, 40, 35);

    // Texto de Período no PDF
    if (startDate && endDate) {
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      const periodText = `PERÍODO DE REFERÊNCIA: ${new Date(startDate).toLocaleDateString()} A ${new Date(endDate).toLocaleDateString()}`;
      pdf.text(periodText, 200, 42, { align: 'right' });
    }

    if (resolved.footer) pdf.addImage(resolved.footer, 'PNG', layout.footer.x, layout.footer.y, layout.footer.w, layout.footer.h);
    if (resolved.signature) pdf.addImage(resolved.signature.data, 'PNG', 105 - (resolved.signature.ratio * 6), layout.signature.y, resolved.signature.ratio * 12, 12);
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(settings.director_name.toUpperCase(), 105, layout.director_name_pos.y + 4, { align: 'center' });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.text(settings.director_title.toUpperCase(), 105, layout.director_title_pos.y + 3, { align: 'center' });
  };

  const generatePDFBlob = async (itemsBatch: any[]): Promise<Blob> => {
    setReportItemsToRender(itemsBatch);
    const headerUrl = selectedUnit === 'Belém' ? settings.template_belem_url : settings.template_barcarena_url;
    const footerUrl = selectedUnit === 'Belém' ? settings.footer_belem_url : settings.footer_barcarena_url;
    const [resolvedHeader, resolvedSig] = await Promise.all([
        fetchAssetAsBase64(headerUrl, REPORT_SPECIFIC_LOGO || GLOBAL_BRAND_LOGO),
        settings.signature_url ? fetchAssetAsBase64(settings.signature_url, "") : Promise.resolve(null)
    ]);
    const resolvedFooter = footerUrl ? (await fetchAssetAsBase64(footerUrl, "")).data : null;
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const key = selectedUnit === 'Belém' ? 'belem' : 'barcarena';
    const currentLayout = settings.layout?.[key] || { header: { x: 0, y: 0, w: 210, h: 45 }, footer: { x: 0, y: 260, w: 210, h: 37 }, signature: { x: 55, y: 220, w: 100, h: 12 }, director_name_pos: { x: 55, y: 238, w: 100, h: 10 }, director_title_pos: { x: 55, y: 245, w: 100, h: 8 }, content_y: 50 };

    for (let i = 0; i < itemsBatch.length; i += 3) {
        if (i > 0) pdf.addPage();
        drawMasterFrame(pdf, currentLayout, { header: resolvedHeader, signature: resolvedSig, footer: resolvedFooter });
        const pageItems = itemsBatch.slice(i, i + 3);
        for (let j = 0; j < pageItems.length; j++) {
            const item = pageItems[j];
            const element = document.getElementById(`rep-card-${item.id}`);
            if (element) {
                const canvas = await html2canvas(element, { scale: 2 });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, currentLayout.content_y + (j * 60), 190, 55);
            }
        }
    }
    return pdf.output('blob');
  };

  const handleSingleExport = async (item: any) => {
    setGeneratingId(item.id);
    const blob = await generatePDFBlob([item]);
    saveAs(blob, `RELATORIO_${item.name.replace(/\s+/g, '_')}.pdf`);
    setGeneratingId(null);
  };

  return (
    <div className="space-y-10 text-left">
      {/* Cards invisíveis para captura */}
      <div style={{ position: 'fixed', top: '-5000px' }}>
          {renderItems.map(item => (
              <div key={item.id} id={`rep-card-${item.id}`} style={{ width: '800px', padding: '40px' }} className="bg-white border-2 border-slate-200 rounded-[2rem] flex items-center justify-between">
                  <div className="flex-1">
                      <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Setor / Cobertura</p>
                      <h4 className="text-4xl font-black text-slate-900 uppercase">{item.name}</h4>
                      <div className="flex gap-10 mt-6">
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Integrantes / Base RH</p><p className="text-2xl font-black">{item.numerator} / {item.denominator}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Índice</p><p className="text-2xl font-black text-green-600">{item.coverage_percent.toFixed(1)}%</p></div>
                      </div>
                  </div>
                  <div className="w-1 bg-slate-100 h-24 mx-10"></div>
                  <div className="text-center w-32"><span className="text-4xl">👥</span><p className="text-[8px] font-black text-slate-300 mt-2 uppercase">Pequenos Grupos</p></div>
              </div>
          ))}
      </div>

      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Relatórios de Cobertura</h2>
          <p className="text-slate-500 font-medium">Extraia os índices de participação por setor.</p>
        </div>
      </header>

      {/* FILTROS DE PERÍODO */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unidade Hospitalar</label>
            <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value as HospitalUnit)} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                <option value="Belém">Belém</option>
                <option value="Barcarena">Barcarena</option>
            </select>
        </div>
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Data Inicial</label>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"/>
            </div>
        </div>
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Data Final</label>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"/>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-slate-400 font-black uppercase text-[10px] tracking-widest">
                      <th className="py-6 px-10">Setor Hospitalar</th>
                      <th className="py-6 px-4">Cobertura %</th>
                      <th className="py-6 px-10 text-right">Ação</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                  {reportItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-all">
                          <td className="py-8 px-10">
                              <p className="font-black text-slate-800 text-lg uppercase">{item.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Código RH: {item.code}</p>
                          </td>
                          <td className="py-8 px-4">
                              <div className="flex items-center gap-4">
                                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div className={`h-full ${item.coverage_percent >= 80 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(item.coverage_percent, 100)}%` }}></div>
                                  </div>
                                  <span className="font-black text-slate-700">{item.coverage_percent.toFixed(1)}%</span>
                              </div>
                          </td>
                          <td className="py-8 px-10 text-right">
                              <button onClick={() => handleSingleExport(item)} disabled={generatingId !== null} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ml-auto shadow-md hover:bg-black">
                                  {generatingId === item.id ? <Loader2 className="animate-spin" size={14}/> : '📄'} Gerar PDF
                              </button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
};

export default ReportCoverage;
