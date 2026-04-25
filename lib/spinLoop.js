// This is the sequence that runs every 180 seconds
export const runGameCycle = async (supabase) => {
  // 1. Create a NEW draw with a 3-minute expiry
  const endsAt = new Date(Date.now() + 180000).toISOString();
  const { data: newDraw } = await supabase.from('spin_draws').insert([{ 
    status: 'open', 
    ends_at: endsAt 
  }]).select().single();

  // 2. Wait for betting to end (e.g., 170 seconds)
  setTimeout(async () => {
    // 3. Lock the draw
    await supabase.from('spin_draws').update({ status: 'locked' }).eq('id', newDraw.id);
    
    // 4. Wait 5 seconds, then pick a random number (0-36)
    setTimeout(async () => {
      const winNum = Math.floor(Math.random() * 37);
      await supabase.from('spin_draws').update({ 
        winning_number: winNum, 
        status: 'closed' 
      }).eq('id', newDraw.id);
      
      // The trigger we made in SQL handles the history!
    }, 5000);
    
  }, 170000); 
};
