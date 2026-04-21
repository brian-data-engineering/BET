// lib/marketTranslator.js

/**
 * Maps 1xBet "Type" IDs to human-readable labels.
 */
export const outcomeMapping = {
  "1": "Home",
  "2": "Draw",
  "3": "Away",
  "4": "1X",
  "5": "12",
  "6": "X2",
  "9": "Over",
  "10": "Under",
  "7": "Home (Handicap)",
  "8": "Away (Handicap)"
};

/**
 * Extracts specific odds from the nested xmatch_odds_deep raw_json.
 * Structure: raw_json -> eventGroups[] -> events[] -> [ { type, cf } ]
 */
export const extractOdd = (match, groupId, typeId) => {
  const rawJson = match.raw_json || match.xmatch_odds_deep?.[0]?.raw_json;
  if (!rawJson?.eventGroups) return null;

  // Find the Group (e.g., '1' for 1X2)
  const group = rawJson.eventGroups.find(g => String(g.groupId) === String(groupId));
  if (!group) return null;

  // Find the Event. Based on your discovery, events are arrays containing an object.
  const eventEntry = group.events?.find(e => {
    const data = Array.isArray(e) ? e[0] : e;
    return String(data?.type) === String(typeId);
  });

  const finalData = Array.isArray(eventEntry) ? eventEntry[0] : eventEntry;
  return finalData?.cf ? parseFloat(finalData.cf) : null;
};

/**
 * Returns the readable name for a type code.
 */
export const getOutcomeName = (typeId) => {
  return outcomeMapping[String(typeId)] || `Type ${typeId}`;
};
