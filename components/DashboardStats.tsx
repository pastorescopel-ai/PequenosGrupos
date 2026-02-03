
import React from 'react';
import { TrendingUp } from 'lucide-react';

interface DashboardStatsProps {
  sectorName: string;
  coveragePercent: number;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ sectorName, coveragePercent }) => {
  return (
    <div className="bg-blue-950 p-10 rounded-[3rem] text-white shadow-2xl lg:col-span-2 relative overflow-hidden">
      <TrendingUp className="absolute top-0 right-0 p-10 opacity-10" size={160}/>
      <h2 className="text-4xl font-black tracking-tight mb-2">Desempenho Ministerial</h2>
      <p className="text-blue-300 font-medium text-sm mb-10">{sectorName || 'Setor Geral'} • Meta: 80%</p>
      <div className="flex items-center gap-12">
        <div className="text-6xl font-black">{coveragePercent.toFixed(0)}%</div>
        <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
           <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${coveragePercent}%` }}></div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
