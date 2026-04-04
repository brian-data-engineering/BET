import React from 'react';

export default function PrintableTicket({ ticket, cart, user }) {
  // Data Normalization
  const selections = ticket?.selections || cart || [];
  const displayStake = ticket?.stake || 0;
  const displayOdds = ticket?.total_odds || 1;
  const displayPayout = ticket?.potential_payout || 0;
  
  if (selections.length === 0) return null;

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="print-only bg-white text-black p-4 w-[80mm] font-mono text-[11px] leading-tight">
      
      {/* TOP HEADER BOX */}
      <div className="border-4 border-black p-2 flex justify-between items-center mb-0">
        <div className="flex flex-col">
          <span className="font-black text-2xl italic tracking-tighter leading-none uppercase">LUCRA</span>
          <span className="text-[10px] font-bold tracking-[0.2em]">SPORTS BETTING</span>
        </div>
        <div className="text-right flex flex-col text-[10px] font-bold">
          <span>SHOP: 16</span>
          <span>CASHIER: {user?.email?.split('@')[0]?.toUpperCase() || 'ADMIN'}</span>
        </div>
      </div>

      {/* SERIAL & DATE SECTION */}
      <div className="border-x-4 border-b-4 border-black p-2 text-center bg-black text-white">
        <div className="text-sm font-black tracking-widest">
          {ticket?.ticket_serial || 'TICKET PENDING'}
        </div>
        <div className="text-[9px] uppercase font-bold opacity-80">
          Placed: {formatDate()}
        </div>
      </div>

      {/* SELECTIONS LIST - Boxed Layout like the image */}
      <div className="mt-2 space-y-2">
        {selections.map((item, index) => (
          <div key={index} className="border-2 border-black p-2 relative">
            {/* LEAGUE HEADER */}
            <div className="flex justify-between items-center border-b border-black/20 pb-1 mb-1">
              <span className="text-[9px] font-black uppercase truncate max-w-[180px]">
                ⚽ {item.display_league || 'International'}
              </span>
              <span className="text-[9px] font-bold italic">
                {item.startTime ? new Date(item.startTime).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}) : 'LIVE'}
              </span>
            </div>

            {/* MATCH NAME */}
            <div className="font-black text-[12px] uppercase mb-1 leading-none">
              {item.matchName}
            </div>

            {/* SELECTION DETAILS */}
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-700">
                  Market: {item.marketName || 'Match Winner'}
                </div>
                <div className="text-[12px] font-black italic uppercase">
                  Pick: <span className="underline">{item.selection}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black italic">@{parseFloat(item.odds || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TOTALS SUMMARY */}
      <div className="mt-4 border-t-4 border-black pt-2 space-y-1">
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL ODDS:</span>
          <span className="font-black">{parseFloat(displayOdds).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm">
          <span>STAKE (KES):</span>
          <span className="font-black">{parseFloat(displayStake).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>
        <div className="flex justify-between font-black text-xl border-t-2 border-black pt-1 mt-1">
          <span>POTENTIAL WIN:</span>
          <span className="italic uppercase">
            {parseFloat(displayPayout).toLocaleString(undefined, {minimumFractionDigits: 0})}
          </span>
        </div>
      </div>

      {/* BARCODE AREA */}
      <div className="mt-6 flex flex-col items-center">
        <div className="flex items-end gap-[2px] h-10 w-full justify-center">
          {[...Array(50)].map((_, i) => (
            <div 
              key={i} 
              className="bg-black" 
              style={{ 
                width: i % 5 === 0 ? '3px' : '1px', 
                height: (Math.random() * 20) + 20 + 'px' 
              }} 
            />
          ))}
        </div>
        <div className="text-[10px] font-black tracking-[0.5em] mt-2">
          *{ticket?.ticket_serial || '000000000'}*
        </div>
      </div>

      {/* DISCLAIMER */}
      <div className="mt-4 text-[8px] font-bold text-center border-t border-black pt-2 uppercase">
        Check your ticket before leaving the counter.<br />
        No payment for lost or damaged tickets.<br />
        18+ Play Responsibly.
      </div>

      <style jsx>{`
        @media print {
          .print-only {
            display: block !important;
            width: 80mm;
            margin: 0;
            padding: 10px;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
