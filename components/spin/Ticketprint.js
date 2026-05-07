/**
 * components/spin/TicketPrint.js
 *
 * Standardized to match PrintableTicket.js visual identity:
 *   - 72mm thermal width
 *   - Professional black-and-white aesthetic
 *   - Grayscale logo processing
 *   - Status banners for WON/LOST
 */

import React, { useState } from 'react';
import Barcode from 'react-barcode';

const RED_NUMBERS  = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const FALLBACK_LOGO = 'https://i.ibb.co/67wb7Zm1/download.png';

function numColor(n) {
  if (n === 0)             return '#16a34a';
  if (RED_NUMBERS.has(n)) return '#dc2626';
  return '#111111';
}
function numLabel(n) {
  if (n === 0)             return 'GREEN';
  if (RED_NUMBERS.has(n)) return 'RED';
  return 'BLACK';
}
function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-KE', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}
function groupBets(arr = []) {
  return Object.values(
    arr.reduce((acc, b) => {
      if (acc[b.key]) acc[b.key] = { ...acc[b.key], amount: acc[b.key].amount + b.amount };
      else acc[b.key] = { ...b };
      return acc;
    }, {})
  );
}

function fmtDateOnly(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-KE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fmtTimeOnly(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function compactBetLabel(label = '') {
  return String(label || '')
    .replace(/\s+/g, ' ')
    .replace('Low/High Color:', 'Low/High Color ')
    .replace('Color:', 'Color ')
    .replace('Dozen:', 'Dozen ')
    .replace('Column:', 'Column ')
    .replace('Number:', 'Number ')
    .replace('Split:', 'Split ')
    .replace('Street:', 'Street ')
    .replace('Six Line:', 'Six Line ')
    .replace('Corner:', 'Corner ')
    .replace('Finals:', 'Finals ')
    .replace('Mirror:', 'Mirror ')
    .replace('Twins:', 'Twins ')
    .replace('Neighbours', 'Neighbours')
    .trim();
}

// ── printTicket (Native Window Printing) ─────────────────────────────────────

export function printTicket({ ticket, payout, jackpot = 0 }) {
  const bets      = groupBets(ticket?.bets ?? []);
  const betCount  = bets.length;
  const stake     = ticket?.total_stake ?? 0;
  const resolved  = !!payout;
  const won       = resolved && (payout?.amount ?? 0) > 0;
  const winNum    = payout?.winning_number;
  const serial    = ticket?.ticket_serial ?? ticket?.id ?? '00000000';
  const logoSrc   = ticket?.logo_url ?? FALLBACK_LOGO;
  const cashierName = ticket?.cashier_name || ticket?.cashier_username || ticket?.cashier || ticket?.cashier_id || 'N/A';

  const betRows = bets.map((b) => `
    <div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;border-bottom:0.2px solid #eee">
      <span>${b.label}</span>
      <span style="font-weight:900">${b.amount.toLocaleString()}</span>
    </div>`).join('');

  const winRows = (payout?.winning_labels ?? []).map((label) => `
    <div style="font-size:10px;font-weight:900;padding:2px 4px;background:#000;color:#fff;margin-top:2px;display:inline-block;margin-right:3px">
      ✓ ${label}
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Ticket — ${serial}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#000;background:#fff;width:72mm;margin:0 auto;padding:3mm 2.5mm 8mm;line-height:1.02}
  table{width:100%;border-collapse:collapse}
  td,th{border:1px solid #000;padding:2px 3px;vertical-align:middle}
  .center{text-align:center}
  .right{text-align:right}
  .bold{font-weight:700}
  .xbold{font-weight:900}
  .tiny{font-size:8px}
  .small{font-size:9px}
  .head{background:#f3f3f3}
  .meta td{height:18px}
  .bets td{font-size:9px}
  .bets .amount{font-weight:700}
  .totals td{font-size:9px}
  .barcode-wrap{padding-top:6px;text-align:center}
  @media print{body{margin:0;padding:2.5mm 2mm 6mm}@page{margin:0;size:72mm auto}}
</style>
</head>
<body>
<table class="meta">
  <tr>
    <td rowspan="3" class="center">
      <img src="${logoSrc}" style="width:148px;max-height:58px;object-fit:contain;display:block;margin:0 auto;filter:grayscale(1) contrast(150%)" onerror="this.src='${FALLBACK_LOGO}'"/>
    </td>
    <td class="bold">Cashier:</td>
    <td class="right xbold">${cashierName}</td>
  </tr>
  <tr>
    <td class="bold">Ticket:</td>
    <td class="right xbold">${serial}</td>
  </tr>
</table>

<table style="margin-top:4px">
  <tr>
    <td class="center xbold small">Bet Placed On ${fmtDateOnly(ticket?.created_at ?? new Date().toISOString())}, ${fmtTimeOnly(ticket?.created_at ?? new Date().toISOString())}</td>
  </tr>
</table>

<table class="bets" style="margin-top:4px">
  <tr class="head xbold center">
    <td style="width:36%">SPIN & WIN</td>
    <td style="width:34%">Selection</td>
    <td style="width:12%">Odds</td>
    <td style="width:18%">Amount</td>
  </tr>
  ${(bets.map((b) => `
    <tr>
      <td class="xbold">SPIN 2 WIN<br>#${ticket?.draw_id ?? ticket?.id ?? 'PENDING'}</td>
      <td class="center xbold">${compactBetLabel(b.label || '')}</td>
      <td class="center xbold">${Number(b.payout || 0).toFixed(0)}</td>
      <td class="right amount">KES ${Number(b.amount || 0).toLocaleString('en-US')}</td>
    </tr>
  `).join('')) || `<tr><td colspan="4" class="center small">No selections</td></tr>`}
</table>

<table class="totals" style="margin-top:4px">
  <tr>
    <td class="center xbold">BET TYPE: SPIN & WIN SINGLE(${betCount})</td>
  </tr>
  <tr>
    <td class="center xbold">TOTAL STAKE: KES ${stake.toLocaleString('en-US')}</td>
  </tr>
</table>

<table class="totals" style="margin-top:4px">
  <tr>
    <td class="xbold">MIN ODD:</td>
    <td class="right xbold">0</td>
    <td class="xbold">MAX ODD:</td>
    <td class="right xbold">${bets.length ? Math.max(...bets.map(b => Number(b.payout || 0))).toFixed(0) : '0'}</td>
  </tr>
  <tr>
    <td class="xbold">Min NET WIN:</td>
    <td class="right xbold">KES ${Math.max(Math.round(stake * 0.36), 0).toLocaleString('en-US')}</td>
    <td class="xbold">Max NET WIN:</td>
    <td class="right xbold">KES ${(resolved && won ? Number(payout?.amount || 0) : jackpot).toLocaleString('en-US')}</td>
  </tr>
</table>

${resolved ? `
<table style="margin-top:4px">
  <tr>
    <td class="center xbold" style="font-size:12px;background:${won ? '#000' : '#f3f3f3'};color:${won ? '#fff' : '#000'}">
      ${won ? 'WON' : 'LOST'} | ${winNum} ${numLabel(winNum)}
    </td>
  </tr>
</table>
${won && winRows ? `<div style="margin-top:4px;text-align:center">${winRows}</div>` : ''}
` : ''}

<div class="tiny center" style="margin-top:5px">
  Terms and conditions apply, ticket placed after market<br/>
  closed will be voided.
</div>

<div class="barcode-wrap">
  <svg id="bc"></svg>
</div>

<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
<script>
  window.onload = function() {
    try { JsBarcode('#bc','${serial}',{width:1.2,height:40,displayValue:false,margin:0}); } catch(e){}
    window.print();
    setTimeout(() => { window.close(); }, 500);
  };
<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=380,height=700,menubar=no,toolbar=no');
  if (!win) { alert('Allow popups for this site to print tickets.'); return; }
  win.document.write(html);
  win.document.close();
}

// ── TicketPreview (React Component) ──────────────────────────────────────────

export default function TicketPreview({ ticket, payout, jackpot = 0, onMarkPaid, onClose }) {
  const [printing, setPrinting] = useState(false);
  const [payingOut, setPayingOut] = useState(false);

  const bets      = groupBets(ticket?.bets ?? []);
  const betCount  = bets.length;
  const stake     = ticket?.total_stake ?? 0;
  const resolved  = !!payout;
  const won       = resolved && (payout?.amount ?? 0) > 0;
  const winNum    = payout?.winning_number;
  const serial    = ticket?.ticket_serial ?? ticket?.id ?? '00000000';
  const logoSrc   = ticket?.logo_url ?? FALLBACK_LOGO;
  const cashierName = ticket?.cashier_name || ticket?.cashier_username || ticket?.cashier || ticket?.cashier_id || 'N/A';

  async function handlePayOut() {
    if (!onMarkPaid || !payout || payout.paid) return;
    setPayingOut(true);
    try {
      await onMarkPaid(payout.id, ticket.id, payout.amount);
    } catch(e) {
      alert(e.message);
    } finally {
      setPayingOut(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm border border-black bg-white p-2.5 text-black shadow-2xl" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <table className="w-full border-collapse text-[9px]">
        <tbody>
          <tr>
            <td className="border border-black p-1 align-top" style={{ width: '56%' }} rowSpan={3}>
              <img src={logoSrc} className="mx-auto h-14 w-36 object-contain grayscale contrast-150" alt="LOGO" />
            </td>
            <td className="border border-black p-1 font-bold">Cashier:</td>
            <td className="border border-black p-1 text-right font-black">{cashierName}</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold">Ticket:</td>
            <td className="border border-black p-1 text-right font-black">{serial}</td>
          </tr>
        </tbody>
      </table>

      <table className="mt-1 w-full border-collapse text-[9px]">
        <tbody>
          <tr>
            <td className="border border-black p-1 text-center font-bold">
              Bet Placed On {fmtDateOnly(ticket?.created_at)}, {fmtTimeOnly(ticket?.created_at)}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="mt-1 w-full border-collapse text-[9px]">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-black p-1">SPIN &amp; WIN</th>
            <th className="border border-black p-1">Selection</th>
            <th className="border border-black p-1">Odds</th>
            <th className="border border-black p-1">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bets.length ? bets.map((b) => (
            <tr key={b.key}>
              <td className="border border-black p-1 font-bold">SPIN 2 WIN<br />#{ticket?.draw_id ?? ticket?.id ?? 'PENDING'}</td>
              <td className="border border-black p-1 text-center font-bold">{compactBetLabel(b.label || '')}</td>
              <td className="border border-black p-1 text-center font-bold">{Number(b.payout || 0).toFixed(0)}</td>
              <td className="border border-black p-1 text-right font-bold">KES {Number(b.amount || 0).toLocaleString('en-US')}</td>
            </tr>
          )) : (
            <tr><td colSpan={4} className="border border-black p-2 text-center">No selections</td></tr>
          )}
        </tbody>
      </table>

      <table className="mt-1 w-full border-collapse text-[9px]">
        <tbody>
          <tr><td className="border border-black p-1 text-center font-black">BET TYPE: SPIN &amp; WIN SINGLE({betCount})</td></tr>
          <tr><td className="border border-black p-1 text-center font-black">TOTAL STAKE: KES {stake.toLocaleString('en-US')}</td></tr>
        </tbody>
      </table>

      <table className="mt-1 w-full border-collapse text-[9px]">
        <tbody>
          <tr>
            <td className="border border-black p-1 font-black">MIN ODD:</td>
            <td className="border border-black p-1 text-right font-black">0</td>
            <td className="border border-black p-1 font-black">MAX ODD:</td>
            <td className="border border-black p-1 text-right font-black">{bets.length ? Math.max(...bets.map(b => Number(b.payout || 0))).toFixed(0) : '0'}</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-black">Min NET WIN:</td>
            <td className="border border-black p-1 text-right font-black">KES {Math.max(Math.round(stake * 0.36), 0).toLocaleString('en-US')}</td>
            <td className="border border-black p-1 font-black">Max NET WIN:</td>
            <td className="border border-black p-1 text-right font-black">KES {(resolved && won ? Number(payout?.amount || 0) : jackpot).toLocaleString('en-US')}</td>
          </tr>
        </tbody>
      </table>

      {resolved && (
        <div className={`mt-2 border border-black p-2 text-center text-[11px] font-black ${won ? 'bg-black text-white' : 'bg-neutral-100 text-black'}`}>
          {won ? 'WON' : 'LOST'} | {winNum} {numLabel(winNum)}
        </div>
      )}

      <div className="mt-2 text-center text-[8px]">
        Terms and conditions apply, ticket placed after market<br />
        closed will be voided.
      </div>

      <div className="mt-3 text-center">
        <div className="mb-2 flex justify-center">
          <Barcode value={serial} width={1.2} height={40} displayValue={false} margin={0} />
        </div>

        {resolved && won && !payout?.paid && (
          <button onClick={handlePayOut} disabled={payingOut} className="mt-2 w-full bg-black py-3 text-[11px] font-black uppercase text-white disabled:opacity-50">
            {payingOut ? 'Processing...' : 'Pay Out'}
          </button>
        )}

        <div className="mt-3 flex flex-col gap-2">
          <button 
            onClick={() => { setPrinting(true); printTicket({ ticket, payout, jackpot }); setTimeout(() => setPrinting(false), 1200); }}
            disabled={printing}
            className="w-full bg-black py-3 text-[11px] font-black uppercase text-white"
          >
            {printing ? 'Opening...' : 'Print Ticket'}
          </button>
          
          {onClose && (
            <button onClick={onClose} className="w-full py-2 text-[10px] font-black uppercase text-black/50">
              Close Preview
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
