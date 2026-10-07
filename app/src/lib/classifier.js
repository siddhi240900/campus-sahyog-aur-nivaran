// Rule-based complaint helper. Works fully offline; an optional AI hook (ai.js) can improve it.
const RULES = [
  ['projector', ['projector', 'proyector', 'screen', 'hdmi', 'smart board', 'smartboard', 'speaker', 'microphone', 'प्रोजेक्टर']],
  ['computer', ['computer', ' pc', 'pc ', 'monitor', 'keyboard', 'mouse', 'cpu', 'system not', 'laptop', 'software', 'कंप्यूटर']],
  ['network', ['wifi', 'wi-fi', 'internet', 'network', 'router', 'broadband']],
  ['electricity', ['electric', 'light', 'fan', 'bulb', 'tube', 'switch', 'socket', 'power', 'bijli', 'पंखा', 'बिजली', 'short circuit', 'wiring', 'air condition', 'inverter']],
  ['water', ['water', 'tap', 'pipe', 'leak', 'cooler', 'purifier', 'paani', 'pani', 'पानी', 'tank', 'drinking']],
  ['sanitation', ['toilet', 'washroom', 'bathroom', 'dustbin', 'garbage', 'dirty', 'clean', 'smell', 'sanitation', 'drain', 'sewage', 'safai', 'गंदगी', 'शौचालय']],
  ['furniture', ['bench', 'desk', 'chair', 'table', 'door', 'window', 'wall', 'ceiling', 'roof', 'crack', 'lock', 'furniture']],
];
const URGENT = ['spark', 'fire', 'shock', 'short circuit', 'no water', 'flood', 'injur', 'danger', 'unsafe', 'smoke', 'burning'];

export function classifyComplaint(text) {
  const t = ` ${(text || '').toLowerCase()} `;
  let best = { id: 'other', score: 0 };
  for (const [id, words] of RULES) {
    const score = words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
    if (score > best.score) best = { id, score };
  }
  return { category: best.id, matched: best.score > 0, priority: URGENT.some(w => t.includes(w)) ? 'high' : 'normal' };
}
