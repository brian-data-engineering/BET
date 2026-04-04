import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, profiles = [], user }) {
  if (!ticket) return null;
  
  const selections = ticket.selections ? (typeof ticket.selections === 'string' ? JSON.parse(ticket.selections) : ticket.selections) : [];
  const cashier = profiles.find(p => p.id === (ticket.cashier_id || user?.id));

  return (
    <div className="lucra-print-area">
      <div className="ticket-container">
        <center><img src="https://i.ibb.co/67wb7Zm1/download.png" style={{height:'35px'}} alt="LUCRA" /></center>
        <div className="info-line"><span>{cashier?.shop_name || user?.shop_name || "LUCRA"}</span> <span>{cashier?.username || user?.username}</span></div>
        
        <div className="serial-box">{ticket.ticket_serial ? `SERIAL: ${ticket.ticket_serial}` : `BOOKING: ${ticket.booking_code}`}</div>

        <div className="selections">
          {selections.map((s, i) => (
            <div key={i} className="match-row">
              <div className="m-head"><span>{s.leagueName}</span> <span>{s.startTime?.split('T')[1]?.slice(0,5)}</span></div>
              <div className="m-name">{s.matchName}</div>
              <div className="m-pick">{s.marketName}: <b>{s.selection} @{s.odds}</b></div>
            </div>
          ))}
        </div>

        <div className="totals">
          <div className="t-row"><span>TOTAL ODDS:</span> <span>{parseFloat(ticket.total_odds || 1).toFixed(2)}</span></div>
          <div className="t-row"><span>STAKE:</span> <span>{parseFloat(ticket.stake || 0).toLocaleString()} KSh</span></div>
          <div className="payout">POTENTIAL PAYOUT: <b>{parseFloat(ticket.potential_payout || 0).toLocaleString()}</b></div>
        </div>

        <center style={{marginTop:'10px'}}>
          {ticket.ticket_serial && <Barcode value={ticket.ticket_serial} width={1.2} height={40} displayValue={false} />}
          <p style={{fontSize:'9px'}}>{new Date().toLocaleString()}</p>
        </center>
      </div>

      <style jsx global>{`
        .lucra-print-area { display: block; visibility: hidden; }
        @media print {
          body * { visibility: hidden !important; }
          .lucra-print-area, .lucra-print-area * { visibility: visible !important; }
          .lucra-print-area { position: absolute; left: 0; top: 0; width: 72mm; color: black; background: white; padding: 0; margin: 0; display: block !important; }
          .ticket-container { width: 72mm; font-family: 'Courier New', Courier, monospace; padding: 2mm; }
          .info-line { display: flex; justify-content: space-between; font-size: 10px; border-bottom: 1px solid #000; }
          .serial-box { border: 2px solid #000; text-align: center; font-weight: 900; margin: 5px 0; padding: 3px; font-size: 13px; }
          .match-row { border-bottom: 1px dotted #000; padding: 2px 0; }
          .m-head { display: flex; justify-content: space-between; font-size: 9px; }
          .m-name { font-size: 11px; font-weight: 900; text-transform: uppercase; }
          .m-pick { font-size: 10px; }
          .t-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; }
          .payout { border: 2px solid #000; text-align: center; margin-top: 5px; padding: 5px; font-size: 16px; }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>
    </div>
  );
}
