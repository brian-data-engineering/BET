import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, isReprint = false }) {
  if (!ticket) return null;

  const selections = typeof ticket.selections === 'string' 
    ? JSON.parse(ticket.selections) 
    : (Array.isArray(ticket.selections) ? ticket.selections : []);

  return (
    <div className="lucra-print-area" style={{ 
      width: '72mm', 
      margin: '0 auto',
      padding: '8px', 
      fontFamily: 'monospace', 
      color: '#000', 
      backgroundColor: '#fff',
      lineHeight: '1.2'
    }}>
      {/* REPRINT LABEL */}
      {isReprint && (
        <div style={{ 
          textAlign: 'center', 
          border: '2px solid #000', 
          padding: '4px', 
          marginBottom: '10px', 
          fontWeight: '900', 
          fontSize: '16px' 
        }}>
          *** REPRINT COPY ***
        </div>
      )}

      {/* HEADER WITH LOGO IMAGE */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', marginBottom: '10px', paddingBottom: '10px' }}>
        <img 
          src="https://i.ibb.co/67wb7Zm1/download.png" 
          alt="LUCRA" 
          style={{ 
            width: '150px', 
            height: 'auto', 
            margin: '0 auto 8px auto', 
            display: 'block',
            filter: 'grayscale(1) contrast(200%)' 
          }} 
        />
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>SHOP: {ticket.shop_name || "LUCRA"}</div>
        <div style={{ fontSize: '10px' }}>DATE: {new Date(ticket.created_at).toLocaleString()}</div>
      </div>

      {/* SELECTIONS */}
      <div style={{ marginBottom: '10px' }}>
        {selections.map((sel, idx) => (
          <div key={idx} style={{ border: '1px solid #000', padding: '6px', marginBottom: '5px', fontSize: '11px' }}>
            {/* LEAGUE HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', fontWeight: 'bold', color: '#333', borderBottom: '0.5px solid #eee', paddingBottom: '2px', marginBottom: '4px' }}>
              <span style={{ textTransform: 'uppercase' }}>
                {sel.display_league || sel.league_name || "LEAGUE"}
              </span>
              <span>ID: {sel.matchId || sel.match_id}</span>
            </div>

            {/* MATCH NAME */}
            <div style={{ fontWeight: 'bold', fontSize: '13px', margin: '2px 0' }}>
              {sel.matchName || sel.match_name}
            </div>
            
            {/* CLEAN START TIME */}
            {(sel.startTime || sel.clean_start_time) && (
              <div style={{ fontSize: '9px', marginBottom: '4px', fontStyle: 'italic' }}>
                {(sel.clean_start_time || sel.startTime).replace('T', ' ').replace(/\+00:00$/, '')}
              </div>
            )}

            {/* PICK & ODDS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '0.5px dashed #000', paddingTop: '3px', marginTop: '2px' }}>
              <div style={{ fontSize: '10px' }}>
                {sel.marketName || '1X2'}: <strong>{sel.selection}</strong>
              </div>
              <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{sel.odds}</span>
            </div>
          </div>
        ))}
      </div>

      {/* TOTALS WITH COMMA FORMATTING */}
      <div style={{ borderTop: '2px dashed #000', paddingTop: '8px', marginTop: '5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Stake:</span>
          <span style={{ fontWeight: 'bold' }}>
            KSh {Number(ticket.stake).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Odds:</span>
          <span style={{ fontWeight: 'bold' }}>{ticket.total_odds}</span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '20px', 
          fontWeight: '900', 
          marginTop: '8px', 
          borderTop: '1px solid #000', 
          paddingTop: '5px' 
        }}>
          <span>PAYOUT:</span>
          <span>
            {Number(ticket.potential_payout).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* BARCODE */}
      <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Barcode value={String(ticket.ticket_serial || ticket.booking_code)} width={1.5} height={50} displayValue={false} margin={0} />
        <div style={{ fontSize: '14px', fontWeight: '900', marginTop: '5px' }}>
          #{ticket.ticket_serial || "BOOKING"}
        </div>
        <div style={{ fontSize: '10px', marginTop: '5px' }}>Code: {ticket.booking_code}</div>
      </div>
    </div>
  );
}
