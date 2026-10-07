// Optional AI hook. If VITE_AI_ENDPOINT is set (your own server/Cloud Function that calls an AI API),
// it is asked for a category. Never put an AI API key in the browser. If unset or failing,
// the rule-based classifier is used, so nothing depends on AI.
export async function aiClassify(text) {
  const url = import.meta.env.VITE_AI_ENDPOINT; if (!url) return null;
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'classify_complaint', text }) });
    if (!r.ok) return null; const d = await r.json(); return d?.category || null;
  } catch { return null; }
}
