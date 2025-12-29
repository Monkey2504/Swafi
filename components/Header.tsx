
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-[#003399] text-white py-5 px-8 shadow-xl flex items-center justify-between border-b-4 border-[#FFD700]">
      <div className="flex items-center gap-5">
        <div className="bg-white p-2 rounded-xl shadow-inner">
           <div className="w-10 h-10 flex items-center justify-center font-black text-[#003399] text-xl italic border-2 border-[#003399] rounded-lg">
             B
           </div>
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">SNCB Planning <span className="text-[#FFD700]">Pro</span></h1>
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.3em]">NMBS Rail Logistics • Expertise Belgique</p>
        </div>
      </div>
      <div className="hidden lg:flex items-center gap-6">
        <div className="flex flex-col items-end">
           <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest">Système de Roulement</span>
           <span className="text-sm font-bold">Standard B-Rail v4.5</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
