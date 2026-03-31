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
    return now.toLocaleDateString('en-GB') + ', ' + now.toLocaleTimeString('en-GB');
  };

  return (
    <div className="print-only bg-white text-black p-2 w-[80mm] font-mono text-[10px] leading-[1.1]">
      {/* HEADER GRID */}
      <div className="border-2 border-black flex">
        {/* LOGO SECTION */}
        <div className="w-2/3 border-r-2 border-black flex items-center justify-center p-2">
          <img 
            src="https://pushvault.shop/logo.png" 
            alt="LUCRA LOGO" 
            className="max-h-12 max-w-full object-contain"
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
          <span className="font-black text-xl italic tracking-tighter ml-2">LUCRA.BET</span>
        </div>
        
        {/* SHOP INFO */}
        <div className="w-1/3 flex flex-col">
          <div className="border-b border-black flex justify-between px-1 py-0.5">
            <span className="font-bold">Shop:</span>
            <span>16</span>
          </div>
          <div className="border-b border-black flex justify-between px-1 py-0.5">
            <span className="font-bold">Cashier:</span>
            <span className="truncate ml-1">{user?.email?.split('@')[0] || 'Admin'}</span>
          </div>
          <div className="border-b border-black flex justify-between px-1 py-0.5">
            <span className="font-bold">Ticket:</span>
            <span>{ticket?.id?.slice(0, 8) || '000000'}</span>
          </div>
          <div className="flex justify-between px-1 py-0.5">
            <span className="font-bold">Pin:</span>
            <span>{Math.floor(1000 + Math.random() * 9000)}</span>
          </div>
        </div>
      </div>

      {/* DATE PLACED */}
      <div className="text-center font-bold border-x-2 border-b-2 border-black py-1 uppercase text-[9px]">
        Bet Placed On {formatDate()}
      </div>

      {/* MATCH TABLE */}
      <table className="w-full border-x-2 border-b-2 border-black table-fixed border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-[9px] uppercase">
            <th className="w-[25%] border-r border-black p-1 text-left">Event</th>
            <th className="w-[55%] border-r border-black p-1 text-center">Selection</th>
            <th className="w-[20%] p-1 text-right">Odd/Amt</th>
          </tr>
        </thead>
        <tbody>
          {selections.map((item, index) => (
            <tr key={index} className="border-b border-black last:border-b-0 text-[9px]">
              <td className="border-r border-black p-1 align-top font-bold leading-tight">
                {item.marketName || 'Intl'} <br />
                {item.id?.slice(-4) || '9901'}
              </td>
              <td className="border-r border-black p-1 text-center align-top">
                <div className="font-black uppercase">{item.matchName}</div>
                <div className="font-bold">Match Winner({item.selection === '1' ? 'Home' : item.selection === '2' ? 'Away' : 'Draw'})</div>
                <div className="text-[8px]">{item.startTime ? new Date(item.startTime).toLocaleString('en-GB', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}) : ''}</div>
              </td>
              <td className="p-1 text-right align-top font-black text-[11px]">
                {parseFloat(item.odds || 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* FINANCIALS */}
      <div className="border-x-2 border-b-2 border-black font-black uppercase italic">
        <div className="p-1 text-center text-[9px]">BET TYPE: Sports Betting</div>
        
        <div className="border-t border-black flex justify-between p-1 px-2">
          <span>Total Stake:</span>
          <span>KES {parseFloat(displayStake).toLocaleString()}</span>
        </div>
        
        <div className="border-t border-black flex justify-between p-1 px-2">
          <span>Total Odds:</span>
          <span>{parseFloat(displayOdds).toFixed(2)}</span>
        </div>
        
        <div className="border-t-2 border-black flex justify-between p-1 px-2 text-[11px] bg-gray-100">
          <span>Possible Net Win:</span>
          <span>KES {parseFloat(displayPayout).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>
      </div>

      {/* TERMS */}
      <div className="text-[7px] text-center mt-1 leading-tight font-bold">
        This is a copy. Terms and conditions apply, tickets placed after <br />
        market closed will be voided.
      </div>

      {/* BARCODE */}
      <div className="mt-2 flex flex-col items-center">
        <div className="w-full h-8 flex gap-[1px] px-4 overflow-hidden bg-white border-x border-black">
          {[...Array(50)].map((_, i) => (
            <div key={i} className="bg-black shrink-0" style={{ width: `${(i % 3) + 1}px`, height: '100%' }}></div>
          ))}
        </div>
        <span className="text-[8px] font-black tracking-[0.5em] mt-0.5">{ticket?.ticket_serial || '0000000000'}</span>
      </div>
    </div>
  );
}
