import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket }) {
  if (!ticket) return null;

  // DATA RECOVERY
  const selections = typeof ticket.selections === 'string' 
    ? JSON.parse(ticket.selections) 
    : (Array.isArray(ticket.selections) ? ticket.selections : []);

  // SERIAL RECOVERY
  const displaySerial = ticket.ticket_serial || ticket.serial_no || ticket.booking_code || "0000000000";

  return (
    <div className="lucra-print-area" style={{ 
      width: '72mm', margin: '0 auto', padding: '5px', 
      fontFamily: 'monospace', color: '#000', backgroundColor: '#fff', lineHeight: '1.2'
    }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', marginBottom: '8px', paddingBottom: '4px' }}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '900' }}>LUCRA</h1>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>#{displaySerial}</div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        {selections.length > 0 ? selections.map((sel, idx) => (
          <div key={idx} style={{ border: '1px solid #000', padding: '5px', marginBottom: '4px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold' }}>
              <span>{sel.league || sel.category || 'SOCCER'}</span>
              <span>{sel.event_id || sel.match_id || ''}</span>
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '12px', margin: '3px 0' }}>
              {sel.event_name || sel.match_name || sel.teams || sel.match || "Match Data Missing"}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{sel.market_name || 'PICK'}: <strong>{sel.selection_name || sel.outcome || sel.pick}</strong></span>
              <span style={{ fontWeight: 'bold' }}>{sel.odds || sel.price}</span>
            </div>
          </div>
        )) : (
          <div style={{ textAlign: 'center', padding: '10px', border: '1px dashed red' }}>NO SELECTIONS FOUND</div>
        )}
      </div>

      <div style={{ borderTop: '2px dashed #000', paddingTop: '5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Odds:</span>
          <span style={{ fontWeight: 'bold' }}>{ticket.total_odds || '0.00'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '900', marginTop: '5px', borderTop: '1px solid #000', paddingTop: '3px' }}>
          <span>PAYOUT:</span>
          <span>{ticket.potential_payout || ticket.payout || '0'} KSh</span>
        </div>
      </div>

      <div style={{ marginTop: '15px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Barcode value={String(displaySerial)} width={1.4} height={45} displayValue={false} margin={0} />
        <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>*{displaySerial}*</div>
        <p style={{ fontSize: '9px', marginTop: '8px' }}>Thank you for betting with Lucra!</p>
      </div>
    </div>
  );
}
