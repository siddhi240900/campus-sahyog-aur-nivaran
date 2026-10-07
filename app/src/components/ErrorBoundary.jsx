import { Component } from 'react';
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[App crash]', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="splash"><div className="auth-card"><h1>Something went wrong</h1>
        <p className="auth-sub">Reload the page. If it keeps happening, tell the college office what you were doing.</p>
        {import.meta.env.DEV && <pre className="crash">{String(this.state.error?.stack || this.state.error)}</pre>}
        <button className="btn primary" onClick={() => location.reload()}>Reload</button></div></div>
    );
  }
}
