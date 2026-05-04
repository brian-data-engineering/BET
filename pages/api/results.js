import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  // Fetch more than 200 to ensure we have enough after filtering duplicates
  const { data: rawHistory, error } = await supabase
    .from('spin_history_200')
    .select('draw_id, num, color, sector, created_at')
    .order('draw_id', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(400);

  if (error) return res.status(500).json({ error: error.message });

  // 1. Filter out duplicates (Keeping only the freshest record per draw_id)
  const seenDraws = new Set();
  const cleanHistory = [];

  for (const record of rawHistory) {
    if (!seenDraws.has(record.draw_id)) {
      cleanHistory.push(record);
      seenDraws.add(record.draw_id);
    }
    // Stop once we have 200 unique results
    if (cleanHistory.length >= 200) break;
  }

  // 2. Format the response for the partner's UI
  res.status(200).json({
    success: true,
    latest_draw: cleanHistory[0],
    count: cleanHistory.length,
    results: cleanHistory
  });
}
