import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { draw_id, bet_type, selection } = req.body;

  const { data: draw } = await supabase
    .from('spin_results')
    .select('winning_number')
    .eq('draw_id', draw_id)
    .single();

  if (!draw) return res.status(404).json({ error: 'Draw not found' });

  const winNum = draw.winning_number;
  let isWinner = false;

  // --- SOURCE OF TRUTH LOGIC ---

  // 1. STRAIGHT UP
  if (bet_type === 'straight') isWinner = (winNum === parseInt(selection));

  // 2. TWINS (11, 22, 33)
  if (bet_type === 'twins') isWinner = [11, 22, 33].includes(winNum);

  // 3. MIRRORS
  if (bet_type === 'mirror') {
    const mirrors = { '12|21': [12, 21], '13|31': [13, 31], '23|32': [23, 32] };
    isWinner = mirrors[selection]?.includes(winNum) || false;
  }

  // 4. SECTORS (A-F)
  if (bet_type === 'sector') {
    const sectors = {
      'A': [32, 15, 19, 4, 21, 2], 'B': [25, 17, 34, 6, 27, 13],
      'C': [36, 11, 30, 8, 23, 10], 'D': [5, 24, 16, 33, 1, 20],
      'E': [14, 31, 9, 22, 18, 29], 'F': [7, 28, 12, 35, 3, 26]
    };
    isWinner = sectors[selection]?.includes(winNum) || false;
  }

  // 5. FINALS (Numbers ending in X)
  if (bet_type === 'finals') {
    const lastDigit = winNum.toString().slice(-1);
    isWinner = lastDigit === selection.toString();
  }

  // 6. HI-LO COLOR COMBOS
  if (bet_type === 'hi_lo_color') {
    const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(winNum);
    const isHigh = winNum >= 19;
    
    if (selection === 'High Red') isWinner = isHigh && isRed;
    if (selection === 'High Black') isWinner = isHigh && !isRed && winNum !== 0;
    if (selection === 'Low Red') isWinner = !isHigh && isRed;
    if (selection === 'Low Black') isWinner = !isHigh && !isRed && winNum !== 0;
  }

  // 7. STANDARD OUTSIDE (Red/Black, Even/Odd)
  if (bet_type === 'color') {
    const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(winNum);
    isWinner = selection === 'red' ? isRed : (!isRed && winNum !== 0);
  }

  res.status(200).json({
    draw_id,
    winning_number: winNum,
    is_winner: isWinner,
    payout: isWinner ? "Check Markets API for Odds" : 0
  });
}
