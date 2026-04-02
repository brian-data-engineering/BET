import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Wallet({ operatorProfile, syncData }) {
  const [amount, setAmount] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); // THE LOCK

  const handleTransfer = async (e) => {
    // 1. Prevent form double-submission
    if (e) e.preventDefault();
    
    // 2. Immediate Exit if already running
    if (isProcessing || !amount || parseFloat(amount) <= 0) return;

    setIsProcessing(true); // LOCK THE DOOR

    try {
      const { error } = await supabase.rpc('transfer_credits', {
        p_sender_id: operatorProfile.id,
        p_receiver_id: receiverId,
        p_amount: parseFloat(amount)
      });

      if (error) {
        alert("Transfer Failed: " + error.message);
      } else {
        setAmount(''); // Clear input
        await syncData(); // Refresh balances from DB Truth
      }
    } catch (err) {
      console.error("Critical Error:", err);
    } finally {
      setIsProcessing(false); // UNLOCK THE DOOR
    }
  };

  return (
    <div className="p-6">
      {/* ... other UI code ... */}
      <form onSubmit={handleTransfer}>
        <input 
          type="number" 
          value={amount} 
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter Amount"
          className="input-style"
        />
        
        <button 
          type="submit"
          disabled={isProcessing} // DISABLE BUTTON VISUALLY
          className={`${isProcessing ? 'bg-gray-500' : 'bg-green-600'} text-white font-bold py-2 px-4 rounded`}
        >
          {isProcessing ? 'PROCESSING...' : 'AUTHORIZE DISPATCH'}
        </button>
      </form>
    </div>
  );
}
