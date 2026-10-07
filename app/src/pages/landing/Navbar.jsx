import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="l-nav">
      <div className="l-nav-in">
        <Link to="/" className="l-logos" aria-label="CAMPUS सहयोग और निवारण">
          <img className="l-college" src="/assets/college-logo.jpeg" alt="Government Women's Polytechnic, Patna" />
          <span className="l-sep" />
          <img className="l-app" src="/assets/campus-logo.png" alt="CAMPUS सहयोग और निवारण" />
        </Link>
        <nav className={`l-links ${open ? 'open' : ''}`} aria-label="Primary">
          <a href="#features" onClick={() => setOpen(false)}>Features</a>
          <a href="#roles" onClick={() => setOpen(false)}>Who it is for</a>
          <a href="#how" onClick={() => setOpen(false)}>How it works</a>
          <Link to="/login" className="btn outline">Login</Link>
          <Link to="/register" className="btn gold">Register</Link>
        </nav>
        <button className="icon-btn l-burger" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}><Icon name={open ? 'close' : 'menu'} /></button>
      </div>
    </header>
  );
}
