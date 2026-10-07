import { Link } from 'react-router-dom';
export default function Footer() {
  return (
    <footer className="l-foot">
      <div className="l-foot-in">
        <div className="l-foot-id"><img src="/assets/college-logo.jpeg" alt="" /><div><b>Government Women’s Polytechnic, Patna</b><small>CAMPUS सहयोग और निवारण</small></div></div>
        <nav aria-label="Footer"><Link to="/login">Login</Link><Link to="/register">Register</Link></nav>
      </div>
      <p className="copy">© {new Date().getFullYear()} Government Women’s Polytechnic, Patna. All rights reserved.</p>
    </footer>
  );
}
