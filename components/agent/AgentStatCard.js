// components/agent/AgentStatCard.js
export default function AgentStatCard({ label, value, icon: Icon, color = "blue" }) {
  const colorMap = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    green: "text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20"
  };

  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <span className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest block mb-1">{label}</span>
        <span className={`text-3xl font-black italic tracking-tighter ${color === 'green' ? 'text-[#10b981]' : 'text-white'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}
