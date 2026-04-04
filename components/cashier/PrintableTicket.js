import React from 'react';

export default function PrintableTicket({ ticket, cart, user }) {
  // Data Normalization
  const selections = ticket?.selections || cart || [];
  const displayStake = ticket?.stake || 0;
  const displayPayout = ticket?.potential_payout || 0;
  const serialNumber = ticket?.ticket_serial || '01719232068236';
  
  if (selections.length === 0) return null;

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB');
  };

  return (
    <div className="print-only bg-white text-black p-2 w-[80mm] font-sans text-[11px] leading-[1.2]">
      
      {/* LOGO & BRANDING */}
      <div className="flex flex-col items-center mb-2">
        <img 
          src="https://pushvault.shop/logo.png" 
          alt="LOGO" 
          className="h-12 w-auto object-contain mb-1"
        />
        <span className="font-bold text-[10px]">MBK777</span>
      </div>

      {/* SHOP & TICKET INFO */}
      <div className="space-y-0.5 mb-2">
        <div className="flex justify-between">
          <span>Shop: #9546</span>
          <span>Cashier: {user?.email?.split('@')[0] || 'Alberto'}</span>
        </div>
        <div>Time: {formatDate()}</div>
        <div>No.: {serialNumber}</div>
        <div className="font-bold">Total Stake: {parseFloat(displayStake).toFixed(2)}KSh</div>
      </div>

      {/* SELECTIONS - Boxed Layout matching image */}
      <div className="border-t border-black">
        {selections.map((item, index) => (
          <div key={index} className="border-b border-x border-black p-1.5 relative">
            {/* LEAGUE & DATE */}
            <div className="flex justify-between items-start text-[9px] mb-1">
              <span className="uppercase font-medium max-w-[70%]">
                Soccer. {item.display_league || 'International'}
              </span>
              <span className="text-right">
                {item.startTime ? new Date(item.startTime).toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit', year:'2-digit'}) : '04/04/26'}<br/>
                {item.startTime ? new Date(item.startTime).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) : '13:30'}
              </span>
            </div>

            {/* MATCH NAME WITH ID */}
            <div className="font-bold text-[11px] flex items-start gap-1 mb-1">
              <span className="bg-black text-white px-1 rounded-sm text-[9px]">
                {item.id?.slice(-4) || Math.floor(1000 + Math.random() * 9000)}
              </span>
              <span className="uppercase">{item.matchName || 'Unknown Match'}</span>
            </div>

            {/* MARKET & SELECTION */}
            <div className="flex justify-between items-end mt-1">
              <div className="text-[10px] leading-tight pr-4">
                <span className="font-bold">{item.marketName || 'Match Result'}</span>
                <br />
                <span>- {item.selection === '1' ? 'Home' : item.selection === '2' ? 'Away' : item.selection}</span>
              </div>
              <div className="font-bold text-[12px]">
                {parseFloat(item.odds || 0).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TOTALS SECTION */}
      <div className="mt-1 space-y-0.5">
        <div className="flex justify-between font-bold border-b border-black py-0.5">
          <span>Express</span>
          <span>{parseFloat(ticket?.total_odds || 100.09).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold border-b border-black py-0.5">
          <span>Total Stake</span>
          <span>{parseFloat(displayStake).toFixed(2)}KSh</span>
        </div>
        <div className="flex justify-between font-black text-[14px] py-1">
          <span>Payout</span>
          <span>{parseFloat(displayPayout).toLocaleString(undefined, {minimumFractionDigits: 2})}KSh</span>
        </div>
      </div>

      {/* BARCODE AREA */}
      <div className="mt-2 flex flex-col items-center">
        {/* Simplified Barcode Graphic */}
        <div className="w-full flex items-center justify-center overflow-hidden h-12 gap-[1.5px]">
          {[...Array(35)].map((_, i) => (
            <div 
              key={i} 
              className="bg-black shrink-0" 
              style={{ 
                width: i % 4 === 0 ? '4px' : '2px', 
                height: '100%' 
              }} 
            />
          ))}
        </div>
        <div className="text-[10px] font-bold mt-1 tracking-tight">
          {serialNumber}
        </div>
        <div className="text-[10px] mt-1 italic">Thank you!</div>
      </div>

      <style jsx>{`
        @media print {
          .print-only {
            display: block !important;
            width: 80mm;
            margin: 0 auto;
            padding: 5px;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
          /* Hide non-print elements */
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </div>
  );
}
