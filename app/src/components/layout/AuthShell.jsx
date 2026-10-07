import { Link } from 'react-router-dom';
export function AuthShell({ title, subtitle, children, wide }) {
  return (
    <main className="auth-page">
      <aside className="auth-side">
        <Link to="/"><img src="/assets/campus-logo.png" alt="CAMPUS सहयोग और निवारण" /></Link>
        <p className="auth-tag">One digital platform for a connected and smarter college.</p>
        <div className="auth-college"><img src="/assets/college-logo.jpeg" alt="" /><span>Government Women’s Polytechnic, Patna</span></div>
      </aside>
      <section className="auth-main">
        <div className={`auth-card ${wide ? 'wide' : ''}`}>
          <Link to="/" className="auth-mobile-logo"><img src="/assets/campus-mark.png" alt="" /><b>CAMPUS</b></Link>
          <h1>{title}</h1>{subtitle && <p className="auth-sub">{subtitle}</p>}
          {children}
        </div>
      </section>
    </main>
  );
}
