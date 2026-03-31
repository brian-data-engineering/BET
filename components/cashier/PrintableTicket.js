import { QRCodeSVG } from 'qrcode.react';

export default function PrintableTicket({ ticket }) {
  if (!ticket) return null;

  // 1. DATA SAFETY: Ensure selections is always an array for the .map()
  const selections = Array.isArray(ticket.selections) 
    ? ticket.selections 
    : JSON.parse(ticket.selections || '[]');

  const formatCurrency = (num) => 
    new Intl.NumberFormat('en-KE', { minimumFractionDigits: 2 }).format(num || 0);

  // 2. REFERENCE LOGIC: Use Serial if paid, otherwise use Booking Code
  const displayReference = ticket.ticket_serial || ticket.booking_code || "PENDING";

  return (
    <div className="print-only p-4 text-black bg-white w-[80mm] font-mono text-[12px] leading-tight">
      {/* Header / Logo */}
      <div className="text-center border-b-2 border-black pb-4 mb-4">
        <h1 className="text-2xl font-black italic tracking-tighter uppercase mb-0">
          LUCRA<span className="opacity-50">.BET</span>
        </h1>
        <p className="text-[9px] font-bold tracking-widest uppercase">Nairobi Retail Terminal #01</p>
        <p className="text-[9px] mt-1">
          {ticket.paid_at ? new Date(ticket.paid_at).toLocaleString('en-GB') : new Date().toLocaleString('en-GB')}
        </p>
      </div>

      {/* Selections Section */}
      <div className="mb-4">
        <div className="flex justify-between border-b border-black mb-2 py-1 font-black uppercase text-[10px]">
          <span>Event / Selection</span>
          <span>Odds</span>
        </div>
        
        {selections.map((item, i) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between items-start font-bold text-[11px]">
              <span className="max-w-[80%] uppercase leading-none">{item.matchName}</span>
              <span>{parseFloat(item.odds || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] mt-1 italic">
              <span className="font-black">PICK: {item.selection}</span>
              <span className="opacity-70">[{item.marketName || 'Match Winner'}]</span>
            </div>
          </div>
        ))}
      </div>

      {/* Financial Summary */}
      <div className="border-t-2 border-black pt-3 space-y-2">
        <div className="flex justify-between text-[11px]">
          <span className="font-bold">TOTAL ODDS:</span>
          <span className="font-black">
            {(ticket.total_odds || ticket.odds || 0).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="font-bold">STAKE (KES):</span>
          <span className="font-black">{formatCurrency(ticket.stake)}</span>
        </div>
        
        {/* Payout Display - Logic to check both possible column names */}
        <div className="flex justify-between items-center border-y-2 border-black my-2 py-3">
          <span className="text-sm font-black italic uppercase">Pot. Payout</span>
          <span className="text-xl font-black italic tracking-tighter">
            KES {formatCurrency(ticket.potential_payout || ticket.payout)}
          </span>
        </div>
      </div>

      {/* Validation & Security */}
      <div className="mt-6 flex flex-col items-center pt-2">
        <div className="p-2 border border-black rounded-lg">
          <QRCodeSVG 
            value={displayReference} 
            size={120} 
            level="M" 
            includeMargin={false}
          />
        </div>
        
        <div className="mt-4 text-center w-full">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Ticket Reference (Serial)</p>
          <p className="font-black text-lg tracking-[0.1em] bg-black text-white px-2 py-1 italic w-full">
            {displayReference}
          </p>
        </div>

        {/* Footer Fine Print */}
        <div className="text-[8px] mt-6 uppercase text-center font-bold leading-normal border-t border-dashed border-black pt-4">
          Tickets expire in 7 days. <br />
          Taxes may apply upon payout. <br />
          Keep this receipt for payment. <br />
          <span className="text-[7px] mt-2 block opacity-50 italic">
            Ref: {ticket.id?.substring(0,8).toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
