/**
 * MANUAL OVERRIDE: 
 * This function manually triggers a draw completion.
 * Only use this if the Database Cron fails or for testing.
 */
export const triggerManualSpin = async (drawId) => {
  const { supabase } = await import('./supabaseClient');

  // 1. Pick a random number 0-36
  const winningNumber = Math.floor(Math.random() * 37);

  // 2. Update the draw. 
  // Note: The SQL trigger 'tr_manage_history' will automatically 
  // handle moving this to the 200-history table.
  const { data, error } = await supabase
    .from('spin_draws')
    .update({ 
      winning_number: winningNumber, 
      status: 'closed' 
    })
    .eq('id', drawId)
    .select();

  if (error) console.error("Manual spin failed:", error);
  return { data, winningNumber };
};

/**
 * START NEXT ROUND:
 * Manually starts the next 3-minute window.
 */
export const startNextManualRound = async () => {
  const { supabase } = await import('./supabaseClient');
  const endsAt = new Date(Date.now() + 180000).toISOString();

  await supabase.from('spin_draws').insert([{ 
    status: 'open', 
    ends_at: endsAt 
  }]);
};
