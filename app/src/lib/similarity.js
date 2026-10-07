const STOP = new Set('the and for not with this that its our there here has have had very too please from are was were been can cant cannot does doesnt dont working work since days day again still any some all one two three kya hai hain nahi'.split(' '));
export const tokens = s => (s || '').toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/(ing|ed|es|s)$/, ''));
export function jaccard(a, b) {
  const A = new Set(a), B = new Set(b); if (!A.size || !B.size) return 0;
  let i = 0; A.forEach(x => B.has(x) && i++);
  return i / (A.size + B.size - i);
}
export const placeKey = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const isOpen = c => c.status !== 'resolved';

// Open complaints that look like the one being written.
export function findSimilar(draft, existing) {
  const dt = tokens(`${draft.title} ${draft.description}`);
  return existing.filter(c => isOpen(c) && c.category === draft.category).filter(c => {
    const sameRes = draft.resourceId && c.resourceId === draft.resourceId;
    const samePlace = draft.location && c.location && placeKey(draft.location) === placeKey(c.location);
    return sameRes || samePlace || jaccard(dt, tokens(`${c.title} ${c.description}`)) >= 0.34;
  });
}

// Open complaints about the same place + category (2 or more = a repeated issue).
export function repeatedIssues(complaints) {
  const map = new Map();
  complaints.filter(isOpen).forEach(c => {
    const place = c.resourceName || c.location; if (!place) return;
    const key = `${placeKey(place)}|${c.category}`;
    if (!map.has(key)) map.set(key, { place, category: c.category, items: [] });
    map.get(key).items.push(c);
  });
  return [...map.values()].filter(g => g.items.length >= 2).sort((a, b) => b.items.length - a.items.length);
}
