// PaperPulse: group previous-year questions by the concept they test, even when worded differently.
const FILLER = new Set('what which who whom whose why how when where explain describe define discuss write short note notes brief briefly state list give name mention differentiate difference between distinguish compare comparison with example examples following any two three four five six eight ten marks mark answer question questions draw neat diagram sketch show using use the an is are was were be been being to in on at for and or by as it its this that these those their there then than etc enumerate elaborate illustrate justify derive prove find calculate determine solve'.split(' '));
const SYN = { programming: 'program', programme: 'program', algorithms: 'algorithm', algo: 'algorithm', rdbms: 'database', dbms: 'database', ckt: 'circuit', circuits: 'circuit', transformers: 'transformer', motors: 'motor', engines: 'engine', laws: 'law', types: 'type', kinds: 'type', classification: 'type', classify: 'type', advantages: 'advantage', disadvantages: 'disadvantage', merits: 'advantage', demerits: 'disadvantage', applications: 'application', uses: 'application', working: 'principle', operation: 'principle', construction: 'principle', features: 'feature', characteristics: 'feature', properties: 'feature', concept: '', meaning: '' };
const stem = w => { w = w in SYN ? SYN[w] : w; return w.length > 4 ? w.replace(/(ies|ing|ed|es|s)$/, m => (m === 'ies' ? 'y' : '')) : w; };

export function keyTerms(text) {
  const out = new Set();
  (text || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).forEach(raw => {
    if (!raw || raw.length < 2 || FILLER.has(raw)) return;
    const s = stem(raw); if (s && s.length > 1 && !FILLER.has(s)) out.add(s);
  });
  return [...out];
}
function similar(a, b) {
  if (!a.length || !b.length) return false;
  const B = new Set(b); const shared = a.filter(x => B.has(x)).length; if (!shared) return false;
  const small = Math.min(a.length, b.length), overlap = shared / small, dice = (2 * shared) / (a.length + b.length);
  return (shared >= 2 && overlap >= 0.6) || dice >= 0.6 || (small === 1 && overlap === 1 && Math.max(a.length, b.length) <= 3);
}
// papers: [{year, questions:[string]}]
export function analysePapers(papers) {
  const items = [];
  papers.forEach(p => (p.questions || []).forEach(q => { const terms = keyTerms(q); if (terms.length) items.push({ year: p.year, text: q, terms }); }));
  const clusters = [];
  items.forEach(it => {
    let home = clusters.find(c => similar(it.terms, c.terms));
    if (!home) { home = { terms: it.terms, freq: new Map(), items: [] }; clusters.push(home); }
    home.items.push(it); it.terms.forEach(t => home.freq.set(t, (home.freq.get(t) || 0) + 1));
    home.terms = [...home.freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
  });
  const years = [...new Set(papers.map(p => p.year))].sort();
  const out = clusters.map(c => {
    const ys = [...new Set(c.items.map(i => i.year))].sort();
    return { label: c.terms.slice(0, 3).map(t => t[0].toUpperCase() + t.slice(1)).join(', '), keywords: c.terms, count: c.items.length, years: ys, items: c.items, hot: ys.length >= 3 || (years.length > 1 && ys.length === years.length) };
  }).sort((a, b) => b.years.length - a.years.length || b.count - a.count);
  return { years, totalQuestions: items.length, clusters: out, repeated: out.filter(c => c.years.length > 1) };
}

// Turns pasted paper text (copied from a PDF / Word file) into a list of questions, so nobody has to retype them.
// Handles "Q1.", "1)", "(a)", questions wrapped over several lines, and a trailing "(5 marks)".
const MARK = /^\s*(?:q(?:uestion)?\.?\s*\d+[a-z]?\s*[).:\-–]?|\d{1,2}[a-z]?\s*[).:\-–]|\(?[a-h]\)|\(?[ivx]{1,4}\))\s*/i;
const MARKS_TAIL = /[[(]\s*\d+\s*(?:marks?|m)?\s*[\])]\s*$/i;
export function splitQuestions(raw) {
  const text = (raw || '').replace(/\r/g, '').replace(/\s+(?=q(?:uestion)?\.?\s*\d+[a-z]?\b)/gi, '\n');
  const lines = text.split('\n').map(l => l.trim().replace(MARKS_TAIL, '').trim()).filter(Boolean);
  const hasMarks = lines.some(l => MARK.test(l));
  const out = [];
  lines.forEach(l => {
    if (!hasMarks || MARK.test(l) || !out.length) out.push(l.replace(MARK, ''));
    else out[out.length - 1] += ' ' + l;           // wrapped line: belongs to the previous question
  });
  return out.map(q => q.replace(/\s+/g, ' ').trim()).filter(q => q.length > 5);
}
