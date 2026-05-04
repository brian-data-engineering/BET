export default function handler(req, res) {
  const markets = [
    // --- STANDARD BOARD MARKETS ---
    { id: 'straight', name: 'Straight Up (0-36)', odds: 36, category: 'Main' },
    { id: 'color_red', name: 'Red', odds: 2, category: 'Outside' },
    { id: 'color_black', name: 'Black', odds: 2, category: 'Outside' },
    { id: 'even_odd', name: 'Even/Odd', odds: 2, category: 'Outside' },
    { id: 'hi_lo', name: 'Low (1-18) / High (19-36)', odds: 2, category: 'Outside' },
    { id: 'dozens', name: 'Dozens (1st, 2nd, 3rd)', odds: 3, category: 'Outside' },
    { id: 'columns', name: 'Columns (1, 2, 3)', odds: 3, category: 'Outside' },

    // --- DELUXE EXCLUSIVE MARKETS ---
    { 
      id: 'twins', 
      name: 'Twins (11|22|33)', 
      odds: 12, 
      category: 'Deluxe',
      description: 'Wins if result is 11, 22, or 33'
    },
    { 
      id: 'mirror', 
      name: 'Mirrors', 
      odds: 18, 
      category: 'Deluxe',
      options: ['12|21', '13|31', '23|32'] 
    },
    { 
      id: 'finals', 
      name: 'Finals (0-9)', 
      odds: 9, 
      category: 'Deluxe',
      description: 'Wins if number ends in the selected digit (e.g. Final 2 = 2, 12, 22, 32)' 
    },
    { 
      id: 'sector', 
      name: 'Sectors (A-F)', 
      odds: 6, 
      category: 'Deluxe',
      options: ['A', 'B', 'C', 'D', 'E', 'F']
    },

    // --- HI-LO COLOR COMBOS ---
    { 
      id: 'hi_lo_color', 
      name: 'Low/High Color', 
      odds: 4, 
      category: 'Combo',
      options: ['High Red', 'High Black', 'Low Red', 'Low Black'] 
    }
  ];

  res.status(200).json({
    game: "Lucra Deluxe Spin",
    currency: "KSh",
    last_updated: new Date().toISOString(),
    markets: markets
  });
}
