import { QRCodeSVG } from 'qrcode.react';

export default function PrintableTicket({ ticket, cart, stake }) {
  // Use DB ticket data if available, otherwise fallback to the live terminal state
  const selections = ticket?.selections || cart || [];
  const displayStake = ticket?.stake || stake || 0;
  
  if (selections.length === 0) return null;

  const formatCurrency = (num) => 
    new Intl.NumberFormat('en-KE', { minimumFractionDigits: 2 }).format(num || 0);

  // Calculate totals dynamically to ensure the receipt is never blank
  const totalOdds = selections.reduce((acc, item) => acc * parseFloat(item.odds || 1), 1);
  const potentialPayout = displayStake * totalOdds;
  const displayReference = ticket?.ticket_serial || "PREVIEW-ONLY";

  return (
    <div className="print-only p-4 text-black bg-white w-[80mm] font-mono text-[11px] leading-tight">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-3 mb-3">
        <h1 className="text-2xl font-black italic tracking-tighter uppercase mb-0">LUCRA.BET</h1>
        <p className="text-[9px] font-bold uppercase tracking-widest">Nairobi Retail Terminal #01</p>
        <p className="text-[9px] mt-1">{new Date().toLocaleString('en-GB')}</p>
      </div>

      {/* Events Table */}
      <div className="mb-3">
        <div className="flex justify-between border-b border-black mb-2 pb-1 font-black uppercase text-[9px]">
          <span>Event / Selection</span>
          <span>Odds</span>
        </div>
        
        {selections.map((item, i) => (
          <div key={i} className="mb-2 border-b border-dotted border-gray-300 pb-1">
            <div className="flex justify-between items-start font-bold">
              <span className="max-w-[75%] uppercase leading-none">{item.matchName}</span>
              <span>{parseFloat(item.odds || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[9px] mt-1 italic">
              <span className="font-black">PICK: {item.selection}</span>
              <span className="opacity-70">[{item.marketName || '1X2'}]</span>
            </div>
          </div>
        ))}
      </div>

      {/* Financials */}
      <div className="border-t-2 border-black pt-2 space-y-1">
        <div className="flex justify-between">
          <span className="font-bold uppercase">Total Odds:</span>
          <span className="font-black">{totalOdds.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold uppercase">Stake (KES):</span>
          <span className="font-black">{formatCurrency(displayStake)}</span>
        </div>
        
        <div className="flex justify-between items-center border-y-2 border-black my-2 py-2">
          <span className="text-[10px] font-black italic uppercase">Potential Payout</span>
          <span className="text-lg font-black italic tracking-tighter">
            KES {formatCurrency(potentialPayout)}
          </span>
        </div>
      </div>

      {/* Security & Validation */}
      <div className="mt-4 flex flex-col items-center">
        <div className="p-1 border border-black mb-2">
          <QRCodeSVG value={displayReference} size={100} level="M" />
        </div>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-1">Ticket Serial</p>
        <p className="font-black text-sm bg-black text-white px-4 py-1 italic w-full text-center tracking-widest">
          {displayReference}
        </p>
      </div>

      <div className="text-[7px] mt-4 text-center uppercase font-bold border-t border-dashed border-black pt-3">
        Expires in 7 days. No receipt, no payout. <br />
        Verify at lucra.bet/verify
      </div>
    </div>
  );
}
