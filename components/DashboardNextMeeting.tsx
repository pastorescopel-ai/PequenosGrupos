
import React from 'react';
import { Calendar, CalendarCheck } from 'lucide-react';
import { MeetingSchedule } from '../types';

interface DashboardNextMeetingProps {
  meetingSchedule?: MeetingSchedule;
  onEdit: () => void;
}

const DashboardNextMeeting: React.FC<DashboardNextMeetingProps> = ({ meetingSchedule, onEdit }) => {
  const isMeetingInPast = meetingSchedule ? new Date(meetingSchedule.full_date) < new Date() : false;
  const isDeclined = meetingSchedule?.chaplain_status === 'declined';
  const isConfirmed = meetingSchedule?.chaplain_status === 'confirmed';

  return (
    <div className={`p-10 rounded-[3rem] border-2 flex flex-col justify-between transition-all relative ${
      isMeetingInPast && isConfirmed ? 'bg-green-50 border-green-200 shadow-xl shadow-green-100/50' : 'bg-white border-slate-200 hover:border-blue-200 shadow-sm'
    }`}>
      <div className="text-center">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${isMeetingInPast ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
          {isMeetingInPast ? <CalendarCheck size={40}/> : <Calendar size={40}/>}
        </div>
        <h3 className={`text-2xl font-black ${isMeetingInPast ? 'text-green-800' : 'text-slate-800'}`}>
          {(isMeetingInPast && !isDeclined) ? 'Reunião Realizada' : 'Próxima Reunião'}
        </h3>
        <div className={`mt-4 p-4 rounded-2xl border cursor-pointer transition-all ${isDeclined ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`} onClick={onEdit}>
          <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Agenda:</p>
          <p className={`font-black text-lg ${isDeclined ? 'text-red-700 line-through' : 'text-slate-700'}`}>
            {meetingSchedule ? new Date(meetingSchedule.full_date).toLocaleString('pt-BR') : 'Agendar'}
          </p>
        </div>
      </div>

      <button onClick={onEdit} className="mt-6 w-full py-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 hover:bg-blue-50 tracking-widest transition-all">
        {meetingSchedule ? 'Reagendar' : 'Definir'}
      </button>
    </div>
  );
};

export default DashboardNextMeeting;
