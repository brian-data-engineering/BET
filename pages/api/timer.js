import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  // 1. Fetch the upcoming draw using the verified column names
  const { data: draw, error } = await supabase
    .from('spin_draws')
    .select('id, ends_at, status')
    .eq('status', 'open')
    .gt('ends_at', new Date().toISOString())
    .order('ends_at', { ascending: true })
    .limit(1)
    .single();

  if (error || !draw) {
    return res.status(200).json({ 
      status: 'waiting', 
      message: 'No open draws found. Waiting for scraper...' 
    });
  }

  // 2. Calculate the live countdown
  const now = new Date();
  const endTime = new Date(draw.ends_at);
  const secondsRemaining = Math.max(0, Math.floor((endTime - now) / 1000));

  res.status(200).json({
    draw_id: draw.id,
    seconds_remaining: secondsRemaining,
    // Stop bets when 5 seconds are left to prevent late entries
    is_accepting_bets: secondsRemaining > 5,
    ends_at: draw.ends_at,
    system_time: now.toISOString()
  });
}
