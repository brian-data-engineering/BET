import { supabase } from './supabaseClient';

export const generateBookingCode = async (items) => {
  if (!items || items.length === 0) return null;

  try {
    // 1. AUTO-CLEAN: Delete codes older than 10 minutes immediately
    const expiryTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await supabase
      .from('betsnow')
      .delete()
      .lt('created_at', expiryTime);

    let isUnique = false;
    let newCode = '';
    let attempts = 0;

    // 2. GENERATE UNIQUE 4-DIGIT CODE
    while (!isUnique && attempts < 20) {
      // Generates "1000" through "9999"
      newCode = Math.floor(1000 + Math.random() * 9000).toString();

      const { data } = await supabase
        .from('betsnow')
        .select('booking_code')
        .eq('booking_code', newCode)
        .single();

      if (!data) {
        isUnique = true;
      }
      attempts++;
    }

    // 3. SAVE TO BETSNOW
    const { data, error } = await supabase
      .from('betsnow')
      .insert([{ 
        booking_code: newCode, 
        selections: items 
      }])
      .select();

    if (error) throw error;
    return newCode;

  } catch (error) {
    console.error("Booking Error:", error.message);
    return null;
  }
};
