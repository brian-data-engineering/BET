import React from 'react';
import Barcode from 'react-barcode';

// Sport icon map
const SPORT_ICONS = {
  'soccer':       '⚽',
  'basketball':   '🏀',
  'tennis':       '🎾',
  'ice-hockey':   '🏒',
  'table-tennis': '🏓',
};

// Result label + symbol
const RESULT_DISPLAY = {
  won:     { label: 'WON',     symbol: '✓' },
  lost:    { label: 'LOST',    symbol: '✗' },
  pending: { label: 'PENDING', symbol: '?' },
};

export default function PrintableTicket({ ticket, isReprint = false }) {
  if (!ticket) return null;

  const selections = typeof ticket.selections === 'string'
    ? JSON.parse(ticket.selections)
    : (Array.isArray(ticket.selections) ? ticket.selections : []);

  const logoSource = ticket.logo_url || 'https://i.ibb.co/67wb7Zm1/download.png';

  // Overall ticket status
  const ticketStatus = ticket.status || 'pending';
  const statusDisplay = RESULT_DISPLAY[ticketStatus] || RESULT_DISPLAY.pending;

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

      {/* TICKET STATUS BANNER — only on settled tickets */}
      {ticketStatus !== 'pending' && (
        <div style={{
          textAlign: 'center',
          border: `1.5px solid #000`,
          padding: '3px',
          marginBottom: '8px',
          fontWeight: '900',
          fontSize: '16px',
          letterSpacing: '2px',
          background: ticketStatus === 'won' ? '#000' : '#fff',
          color:  ticketStatus === 'won' ? '#fff' : '#000',
        }}>
          {statusDisplay.symbol} {statusDisplay.label} {statusDisplay.symbol}
        </div>
      )}

      {/* HEADER */}
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
        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
          SHOP: {(ticket.shop_name || 'LUCRA').toUpperCase()}
        </div>
        <div style={{ fontSize: '9px' }}>
          DATE: {new Date(ticket.created_at).toLocaleString()}
        </div>
      </div>

      <div style={{ borderTop: '1.5px solid #000', margin: '5px 0' }}></div>

      {/* SELECTIONS */}
      <div style={{ marginBottom: '10px' }}>
        {selections.map((sel, idx) => {
          const startTime   = sel.startTime || sel.clean_start_time || '';
          const formattedTime = startTime ? startTime.replace('T', ' ').slice(5, 16) : 'LIVE';
          const leagueLabel = (sel.display_league || sel.sport_key || 'EVENT').toUpperCase();
          const sportIcon   = SPORT_ICONS[sel.sport_key] || '🎯';
          const selResult   = sel.result || 'pending';
          const resultInfo  = RESULT_DISPLAY[selResult] || RESULT_DISPLAY.pending;
          const score       = sel.score || null;
          const isSettled   = selResult !== 'pending';

          return (
            <div key={idx} style={{ marginBottom: '10px', borderBottom: '0.5px solid #000', paddingBottom: '4px' }}>

              {/* League + time */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold', opacity: 0.9 }}>
                <span style={{ maxWidth: '70%', overflow: 'hidden' }}>
                  {sportIcon} {leagueLabel}
                </span>
                <span>{formattedTime}</span>
              </div>

              {/* Match name */}
              <div style={{ fontSize: '12px', fontWeight: 'bold', margin: '2px 0' }}>
                [{String(sel.matchId || sel.match_id || '').slice(-4)}] {sel.matchName || `${sel.homeTeam} v ${sel.awayTeam}`}
              </div>

              {/* Market + pick + odds */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>{sel.marketName || 'Result'}: <strong>{sel.selection}</strong></span>
                <span style={{ fontWeight: '900', fontSize: '12px' }}>{parseFloat(sel.odds || 0).toFixed(2)}</span>
              </div>

              {/* Result row — only when settled */}
              {isSettled && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '3px',
                  padding: '2px 4px',
                  background: selResult === 'won' ? '#000' : '#eee',
                  color:      selResult === 'won' ? '#fff' : '#000',
                  fontSize: '10px',
                  fontWeight: '900',
                  letterSpacing: '0.5px',
                }}>
                  <span>{resultInfo.symbol} {resultInfo.label}</span>
                  {score && <span>FT: {score}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* TOTALS */}
      <div style={{ borderTop: '1.5px dashed #000', paddingTop: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span>Total Stake:</span>
          <span style={{ fontWeight: 'bold' }}>
            KSh {Number(ticket.stake || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span>Total Odds:</span>
          <span style={{ fontWeight: 'bold' }}>{parseFloat(ticket.total_odds || 0).toFixed(2)}</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '20px',
          fontWeight: '900',
          marginTop: '6px',
          borderTop: '1.5px solid #000',
          paddingTop: '4px'
        }}>
          <span>PAYOUT:</span>
          <span>{Number(ticket.potential_payout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* BARCODE + SERIAL */}
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Barcode
            value={String(ticket.ticket_serial || '00000000')}
            width={1.2}
            height={40}
            displayValue={false}
            margin={0}
          />
        </div>
        <div style={{ fontSize: '12px', fontWeight: '900', marginTop: '4px' }}>
          #{ticket.ticket_serial}
        </div>
        <div style={{ fontSize: '10px', marginTop: '2px', fontWeight: 'bold' }}>
          CODE: {ticket.booking_code}
        </div>
        <div style={{ fontSize: '8px', marginTop: '10px', fontStyle: 'italic', opacity: 0.8, lineHeight: '1.2' }}>
          Valid for 30 days. No payout without physical ticket.<br />
          Terms & Conditions apply.
        </div>
      </div>
    </div>
  );
}
