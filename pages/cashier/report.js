import { User, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function CashierReport() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-black uppercase tracking-tighter">Shift Summary</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-8 rounded-[2rem] border border-gray-800">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4"><ArrowUpRight className="text-blue-500" /></div>
            <p className="text-xs text-gray-500 font-bold uppercase">Total Stakes</p>
            <p className="text-2xl font-black tracking-tight">KES 45,200</p>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2rem] border border-gray-800">
            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4"><ArrowDownLeft className="text-red-500" /></div>
            <p className="text-xs text-gray-500 font-bold uppercase">Total Payouts</p>
            <p className="text-2xl font-black tracking-tight text-red-400">KES 12,800</p>
          </div>

          <div className="bg-lucra-green p-8 rounded-[2rem] text-black">
            <div className="w-12 h-12 bg-black/10 rounded-2xl flex items-center justify-center mb-4"><DollarSign /></div>
            <p className="text-xs font-black uppercase opacity-60">Net Profit</p>
            <p className="text-2xl font-black tracking-tight">KES 32,400</p>
          </div>
        </div>
      </div>
    </div>
  );
}
