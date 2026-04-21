// lib/marketTranslator.js
export const translateOutcome = (type) => {
  const mapping = {
    "1": "Home",
    "2": "Draw",
    "3": "Away",
    "7": "Home (HC)",
    "8": "Away (HC)",
    "9": "Over",
    "10": "Under"
  };
  return mapping[String(type)] || `Type ${type}`;
};
