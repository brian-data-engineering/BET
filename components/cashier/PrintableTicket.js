import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, profiles = [], user }) {
  if (!ticket) return null;
  
  const selections = ticket.selections ? (typeof ticket.selections === 'string' ? JSON.parse(ticket.selections) : ticket.selections) : [];
  const cashier = profiles.find(p => p.id === (ticket.cashier_id || user?.id));

  return (
    <div className="lucra-print-area">
      <div className="ticket-container">
        {/* HEADER */}
        <div className="center-text">
           <img src="https://i.ibb.co/67wb7Zm1/download.png" style={{height:'38px', marginBottom: '4px'}} alt="LUCRA" />
           <div className="terminal-tag">LUCRA TERMINAL</div>
        </div>
        
        <div className="info-line">
          <span>{cashier?.shop_name || user?.shop_name || "LUCRA"}</span> 
          <span>{cashier?.username || user?.username || "Staff"}</span>
        </div>
        
        <div className="serial-box">
          {ticket.ticket_serial ? `SERIAL: ${ticket.ticket_serial}` : `BOOKING: ${ticket.booking_code}`}
        </div>

        <div className="selections-list">
          {selections.map((s, i) => (
            <div key={i} className="match-item">
              <div className="m-header">
                <span>Soccer, {s.leagueName}</span> 
                <span>{s.startTime?.split('T')[0]}</span>
              </div>
              <div className="m-teams">
                <b>{s.matchName}</b>
              </div>
              <div className="m-bet">
                <span>{s.marketName}: {s.selection}</span>
                <span className="m-odds">@{parseFloat(s.odds).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="ticket-totals">
          <div className="t-row"><span>TOTAL ODDS:</span> <span>{parseFloat(ticket.total_odds || 1).toFixed(2)}</span></div>
          <div className="t-row"><span>STAKE:</span> <span>{parseFloat(ticket.stake || 0).toLocaleString()} KSh</span></div>
          <div className="payout-container">
            <div className="p-label">POTENTIAL PAYOUT</div>
            <div className="p-value">KSh {parseFloat(ticket.potential_payout || 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="center-text barcode-footer">
          {ticket.ticket_serial && (
            <div className="barcode-wrapper">
              <Barcode value={String(ticket.ticket_serial)} width={1.2} height={40} displayValue={false} margin={0} lineColor="#000000" />
            </div>
          )}
          <p className="date-text">{new Date().toLocaleString()}</p>
          <p className="luck-text">*** GOOD LUCK ***</p>
        </div>
      </div>

      <style jsx global>{`
        /* Hide on screen */
        .lucra-print-area { display: none; }
        
        @media print {
          .lucra-print-area { 
            display: block !important; 
            width: 72mm !important;
            background: #ffffff !important;
          }

          .ticket-container { 
            width: 72mm; 
            padding: 2mm;
            font-family: Arial, sans-serif;
            background: #ffffff !important;
          }

          /* FORCE BLACK TEXT ON EVERYTHING */
          .ticket-container * {
            color: #000000 !important;
            background-color: transparent !important;
            border-color: #000000 !important;
            font-family: Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .center-text { text-align: center; width: 100%; }
          .terminal-tag { font-size: 14px; font-weight: bold; border-bottom: 2px solid #000; margin-bottom: 4px; }
          .info-line { display: flex; justify-content: space-between; font-size: 10px; padding: 4px 0; }
          .serial-box { border: 2px solid #000; text-align: center; margin: 5px 0; padding: 5px; font-size: 14px; font-weight: bold; }
          
          .match-item { border-bottom: 1px dashed #000; padding: 4px 0; }
          .m-header { display: flex; justify-content: space-between; font-size: 9px; }
          .m-teams { font-size: 12px; margin: 2px 0; }
          .m-bet { display: flex; justify-content: space-between; font-size: 11px; }

          .ticket-totals { margin-top: 10px; border-top: 2px solid #000; }
          .t-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
          
          .payout-container { border: 3px solid #000; text-align: center; margin-top: 10px; padding: 5px; }
          .p-label { font-size: 12px; font-weight: bold; }
          .p-value { font-size: 24px; font-weight: 900; }

          .barcode-wrapper { display: flex; justify-content: center; margin: 10px 0; }
          .date-text { font-size: 9px; margin: 0; }
          .luck-text { font-size: 12px; font-weight: bold; }
        }
      `}</style>
    </div>
  );
}
