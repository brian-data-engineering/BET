// components/agent/CashierRow.js
import { Monitor, ArrowRight, Send } from 'lucide-react';

export default function CashierRow({ cashier, onDispatch }) {
  return (
    <div className="group bg-[#111926] hover:bg-[#151f2e] p-6 rounded-[2rem] border border-white/5 transition-all flex items-center justify-between">
      <div className="flex items-center gap-5">
        <div className="p-4 bg-white/5 rounded-2xl text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-colors">
          <Monitor size={20} />
        </div>
        <div>
          <h4 className="font-black uppercase italic text-lg leading-tight">{cashier.username}</h4>
          <p className="text-[9px] text-slate-600 font-bold uppercase">UID: {cashier.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="text-right flex items-center gap-8">
        <div>
          <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Terminal Float</span>
          <span className="text-xl font-black italic text-[#10b981]">
            KES {parseFloat(cashier.balance || 0).toLocaleString()}
          </span>
        </div>
        
        <button 
          onClick={() => onDispatch(cashier.id, cashier.username)}
          className="bg-white/5 p-4 px-6 rounded-xl hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase italic flex items-center gap-2"
        >
          Dispatch <Send size={14} />
        </button>
      </div>
    </div>
  );
}
