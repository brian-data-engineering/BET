import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, isReprint = false }) {
  if (!ticket) return null;

  const selections = typeof ticket.selections === 'string' 
    ? JSON.parse(ticket.selections) 
    : (Array.isArray(ticket.selections) ? ticket.selections : []);

  // UPDATED LOGO LOGIC: Priority to operator_logo, fallback to Lucra default
  const logoSource = ticket.operator_logo || "https://i.ibb.co/67wb7Zm1/download.png";

  return (
    <div className="lucra-print-area" style={{ 
      width: '72mm', 
      margin: '0 auto',
      padding: '4px', 
      fontFamily: 'monospace', 
      color: '#000', 
      backgroundColor: '#fff',
      lineHeight: '1.1'
    }}>
      {/* REPRINT LABEL */}
      {isReprint && (
        <div style={{ textAlign: 'center', border: '1.5px solid #000', padding: '2px', marginBottom: '8px', fontWeight: '900', fontSize: '14px' }}>
          *** REPRINT COPY ***
        </div>
      )}

      {/* HEADER - LOGO FETCHED FROM OPERATOR */}
      <div style={{ textAlign: 'center', marginBottom: '5px' }}>
        <img 
          src={logoSource} 
          alt="BRAND LOGO" 
          style={{ 
            width: '140px', 
            maxHeight: '70px',
            objectFit: 'contain',
            margin: '0 auto 5px auto', 
            display: 'block', 
            filter: 'grayscale(1) contrast(150%)' 
          }} 
        />
        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>SHOP: {ticket.shop_name || "LUCRA"}</div>
        <div style={{ fontSize: '9px' }}>DATE: {new Date(ticket.created_at).toLocaleString()}</div>
      </div>

      <div style={{ borderTop: '1.5px solid #000', margin: '5px 0' }}></div>

      {/* SELECTIONS */}
      <div style={{ marginBottom: '10px' }}>
        {selections.map((sel, idx) => {
          const startTime = sel.startTime || sel.clean_start_time || "";
          const formattedTime = startTime ? startTime.replace('T', ' ').slice(5, 16) : ""; 
          const leagueLabel = (sel.display_league || sel.sport_key || "EVENT").toUpperCase();
          
          return (
            <div key={idx} style={{ marginBottom: '10px', borderBottom: '0.5px solid #000', paddingBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.9 }}>
                <span>{leagueLabel}</span>
                <span>{formattedTime}</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', margin: '2px 0' }}>
                [{String(sel.matchId || sel.match_id || "").slice(-4)}] {sel.matchName || sel.match_name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>{sel.marketName || '1X2'}: <strong>{sel.selection}</strong></span>
                <span style={{ fontWeight: '900', fontSize: '12px' }}>{sel.odds}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* TOTALS */}
      <div style={{ borderTop: '1.5 dashed #000', paddingTop: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span>Total Stake:</span>
          <span style={{ fontWeight: 'bold' }}>
            KSh {Number(ticket.stake).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span>Total Odds:</span>
          <span style={{ fontWeight: 'bold' }}>{ticket.total_odds}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '22px', 
          fontWeight: '900', 
          marginTop: '6px', 
          borderTop: '1.5px solid #000', 
          paddingTop: '4px' 
        }}>
          <span>PAYOUT:</span>
          <span>
            {Number(ticket.potential_payout).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* BARCODE & SERIAL */}
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Barcode 
            value={String(ticket.ticket_serial || ticket.booking_code)} 
            width={1.2} 
            height={40} 
            displayValue={false} 
            margin={0} 
          />
        </div>
        <div style={{ fontSize: '13px', fontWeight: '900', marginTop: '4px' }}>
          #{ticket.ticket_serial || "BOOKING"}
        </div>
        <div style={{ fontSize: '9px', marginTop: '2px' }}>Code: {ticket.booking_code}</div>
        <div style={{ fontSize: '8px', marginTop: '8px', fontStyle: 'italic', opacity: 0.8 }}>
          Valid for 30 days. No payout without a valid ticket.
        </div>
      </div>
    </div>
  );
}
