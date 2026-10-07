import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

// Subscribes to a Firestore query/doc. `make` returns a query (or null to skip). Re-subscribes when deps change.
export function useLive(make, deps = [], { single = false } = {}) {
  const [state, setState] = useState({ data: single ? null : [], loading: true, error: null });
  useEffect(() => {
    const q = make();
    if (!q) { setState({ data: single ? null : [], loading: false, error: null }); return; }
    setState(s => ({ ...s, loading: true }));
    return onSnapshot(q,
      snap => setState({ data: single ? (snap.exists() ? { id: snap.id, ...snap.data() } : null) : snap.docs.map(d => ({ id: d.id, ...d.data() })), loading: false, error: null }),
      err => { console.error('[Firestore]', err.code, err.message); setState(s => ({ ...s, loading: false, error: err.code === 'permission-denied' ? 'Access denied by Firestore rules. Publish the latest firestore.rules.' : err.message })); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
