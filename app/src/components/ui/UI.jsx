import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import Icon from './Icon';
import { COMPLAINT_STATUSES } from '../../config/constants';

export function Button({ children, loading, variant = 'primary', size, className = '', icon, ...p }) {
  return (
    <button className={`btn ${variant} ${size || ''} ${className}`} disabled={loading || p.disabled} {...p}>
      {loading ? <span className="spinner" aria-label="Loading" /> : <>{icon && <Icon name={icon} size={16} />}{children}</>}
    </button>
  );
}

export function Field({ label, hint, error, children }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && !error && <small className="hint">{hint}</small>}{error && <small className="error">{error}</small>}</label>;
}
export function Input({ label, hint, error, ...p }) {
  const [show, setShow] = useState(false);
  const secret = p.type === 'password';
  return (
    <Field label={label} hint={hint} error={error}>
      <span className="input-wrap">
        <input {...p} type={secret && show ? 'text' : p.type} />
        {secret && <button type="button" className="pw-toggle" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>}
      </span>
    </Field>
  );
}
export const Select = ({ label, hint, children, ...p }) => <Field label={label} hint={hint}><select {...p}>{children}</select></Field>;
export const Textarea = ({ label, hint, ...p }) => <Field label={label} hint={hint}><textarea {...p} /></Field>;

export const Badge = ({ tone = 'neutral', children }) => <span className={`badge ${tone}`}>{children}</span>;
export const StatusBadge = ({ status }) => <Badge tone={status}>{COMPLAINT_STATUSES.find(s => s.id === status)?.label || status}</Badge>;

export function Empty({ icon = 'spark', title, children, action }) {
  return <div className="empty"><div className="empty-icon"><Icon name={icon} size={26} /></div><b>{title}</b>{children && <p>{children}</p>}{action}</div>;
}
export const Loading = ({ text = 'Loading…' }) => <div className="loading"><span className="spinner dark" />{text}</div>;
export const ErrorNote = ({ error }) => error ? <div className="note danger" role="alert"><Icon name="alert" size={18} /><span>{error}</span></div> : null;

export function PageHeader({ title, subtitle, actions }) {
  return <header className="page-head"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</header>;
}

export function Tabs({ value, onChange, options }) {
  return <div className="tabs" role="tablist">{options.map(o => <button key={o.id} role="tab" aria-selected={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>{o.label}{o.count != null && <i>{o.count}</i>}</button>)}</div>;
}

export function Modal({ title, onClose, children, wide }) {
  const ref = useRef();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;                       // always the latest onClose, without re-running the effect
  useEffect(() => {
    const k = e => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    // Focus the dialog once, on open. (Re-focusing on every render stole the cursor from text fields.)
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, []);
  return (
    <div className="modal-back" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// The signature element: Pending → Assigned → In progress → Resolved
export function StatusTrail({ status, compact, steps = COMPLAINT_STATUSES }) {
  const idx = Math.max(0, steps.findIndex(s => s.id === status));
  return (
    <ol className={`trail ${compact ? 'compact' : ''}`} aria-label={`Status: ${steps[idx]?.label}`}>
      {steps.map((s, i) => (
        <li key={s.id} className={`${i < idx ? 'done' : ''} ${i === idx ? 'now' : ''}`} data-s={s.id}>
          <span className="dot">{i < idx ? <Icon name="check" size={12} /> : null}</span>
          <span className="t-label">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

// ---- Toasts ----
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setList(l => [...l, { id, message, tone }]);
    setTimeout(() => setList(l => l.filter(t => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">{list.map(t => <div key={t.id} className={`toast ${t.tone}`}>{t.message}</div>)}</div>
    </ToastCtx.Provider>
  );
}
