import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './ui/Icon';
import { Loading } from './ui/UI';
import { renderPdfPages } from '../lib/paperFile';

// Shows one PDF or photo exactly as uploaded (used by PaperPulse and College chat).
// blob: the file, type: its MIME type, name: the file name shown above it and used for Download.
export default function FileView({ blob, type, name }) {
  const box = useRef(); const [err, setErr] = useState(''); const [busy, setBusy] = useState(type === 'application/pdf');
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  useEffect(() => {
    if (type !== 'application/pdf') return; let stop = false; const el = box.current;
    renderPdfPages(blob, el, () => stop).catch(() => !stop && setErr('Could not show this PDF here. Use Download to open it.')).finally(() => !stop && setBusy(false));
    return () => { stop = true; el.replaceChildren(); };
  }, [blob, type]);
  return (<div className="pp-file">
    <div className="pp-file-head"><b>{name}</b><a className="btn outline sm" href={url} download={name}><Icon name="download" size={15} />Download</a></div>
    {type === 'application/pdf' ? <>{busy && <Loading />}{err && <p className="error">{err}</p>}<div ref={box} className="pp-pages" /></> : <div className="pp-pages"><img src={url} alt={name} /></div>}
  </div>);
}
