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
 * Extracts 1X2 odds from flat fields (home_odds, draw_odds, away_odds).
 * Falls back to parsing raw_json for other markets (used on match detail page).
 *
 * For groupId=1 (1X2): reads flat fields directly — no JSON parsing needed.
 * For any other groupId: parses raw_json eventGroups as before.
 */
export const extractOdd = (match, groupId, typeId) => {
  // Fast path: 1X2 from flat view columns
  if (String(groupId) === '1') {
    if (String(typeId) === '1') return match.home_odds ?? null;
    if (String(typeId) === '2') return match.draw_odds ?? null;
    if (String(typeId) === '3') return match.away_odds ?? null;
  }

  // Slow path: parse raw_json for deep markets (match detail page)
  const rawJson = match.raw_json || match.xmatch_odds_deep?.[0]?.raw_json;
  if (!rawJson?.eventGroups) return null;

  const group = rawJson.eventGroups.find(g => String(g.groupId) === String(groupId));
  if (!group) return null;

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
