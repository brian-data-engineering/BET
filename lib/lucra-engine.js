export const DELUXE_MARKETS = {
  twins: { 11: [11], 22: [22], 33: [33] },
  mirror: { 12: [12, 21], 13: [13, 31], 23: [23, 32] },
  sectors: {
    A: [32, 15, 19, 4, 21, 2],
    B: [25, 17, 34, 6, 27, 13],
    C: [36, 11, 30, 8, 23, 10],
    D: [5, 24, 16, 33, 1, 20],
    E: [14, 31, 9, 22, 18, 29],
    F: [7, 28, 12, 35, 3, 26]
  }
};

// Check if a result wins for a Deluxe market
export const checkDeluxeWin = (marketType, selection, winningNumber) => {
  const targetNumbers = DELUXE_MARKETS[marketType]?.[selection];
  return targetNumbers?.includes(winningNumber) || false;
};
