
import React from 'react';
import { SemaineData, DayData, DAYS_LIST } from '../types';

interface ScheduleCardProps {
  week: SemaineData;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ week }) => {
  const isOffDay = (day: DayData) => {
    const c = (day.code || "").toUpperCase();
    const offKeywords = ['REPOS', 'CONGÉ', 'HSBR', 'CW', 'RW', 'RH', 'RT', 'RV/', 'RH'];
    return !day.debut && !day.fin || offKeywords.some(k => c.includes(k));
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border-l-8 border-[#003399] overflow-hidden mb-10 transition-all hover:shadow-2xl">
      <div className="bg-[#003399] px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-[#FFD700] rounded-2xl flex items-center justify-center text-[#003399] font-black text-lg shadow-lg">
            {week.semaine}
          </div>
          <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Semaine de roulement {week.semaine}</h3>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
           <div className="h-2.5 w-2.5 rounded-full bg-[#FFD700] animate-pulse"></div>
           <span className="text-[10px] font-black text-white uppercase tracking-widest">En Service</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {DAYS_LIST.map((dayKey) => {
          const day = (week as any)[dayKey] as DayData;
          const isOff = isOffDay(day);

          return (
            <div key={dayKey} className={`p-6 flex flex-col items-center text-center transition-all min-h-[190px] group ${isOff ? 'bg-slate-50/80' : 'hover:bg-blue-50/40'}`}>
              <span className="text-[10px] font-black text-slate-400 uppercase mb-5 tracking-[0.2em]">{dayKey}</span>
              
              <div className={`w-full py-3 px-2 rounded-xl mb-5 flex items-center justify-center font-black text-[13px] shadow-md transition-transform group-hover:scale-105 ${isOff ? 'bg-slate-200 text-slate-500' : 'bg-[#003399] text-[#FFD700] border-b-4 border-blue-900'}`}>
                {day.code || (isOff ? 'REPOS' : '---')}
              </div>

              {!isOff ? (
                <div className="space-y-3 w-full animate-fade-in">
                  <div className="bg-white border-2 border-slate-100 py-3 rounded-2xl shadow-sm group-hover:border-[#FFD700] transition-colors">
                    <div className="text-[14px] font-black text-[#003399]">
                      {day.debut}
                    </div>
                    <div className="flex items-center justify-center gap-1 my-1">
                       <div className="h-px w-4 bg-slate-200"></div>
                       <div className="text-[9px] text-[#FFD700] font-black uppercase">B-Rail</div>
                       <div className="h-px w-4 bg-slate-200"></div>
                    </div>
                    <div className="text-[14px] font-black text-[#003399]">
                      {day.fin}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex items-center justify-center">
                   <span className="text-[10px] font-black text-slate-300 uppercase italic tracking-tighter bg-slate-100 px-3 py-1 rounded-full">
                     Code : {day.code || 'Repos'}
                   </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScheduleCard;
