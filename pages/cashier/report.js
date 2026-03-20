import CashierLayout from '../../components/cashier/CashierLayout';
import { TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react';

export default function CashierReport() {
  const stats = [
    { label: 'Total Sales', value: 'KES 84,200', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Payouts', value: 'KES 31,500', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Cash in Drawer', value: 'KES 52,700', icon: Wallet, color: 'text-lucra-green', bg: 'bg-lucra-green/10' },
  ];

  return (
    <CashierLayout>
      <div className="p-8">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Shift Report</h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Active Session: Cashier_01</p>
          </div>
          <div className="bg-slate-900 px-4 py-2 rounded-xl border border-gray-800 flex items-center gap-2 text-xs font-bold">
            <Calendar size={14} className="text-lucra-green" /> {new Date().toLocaleDateString()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-slate-900 p-8 rounded-[2.5rem] border border-gray-800 group hover:border-gray-700 transition-all">
              <div className={`w-14 h-14 ${s.bg} rounded-2xl flex items-center justify-center mb-6`}>
                <s.icon className={s.color} size={28} />
              </div>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-3xl font-black ${s.label === 'Cash in Drawer' ? 'text-white' : ''}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </CashierLayout>
  );
}
