import { Link } from 'react-router-dom';
export const Brand = ({ to = '/', light }) => (
  <Link to={to} className={`brand ${light ? 'light' : ''}`} aria-label="CAMPUS सहयोग और निवारण home">
    <img className="brand-college" src="/assets/college-logo.jpeg" alt="Government Women's Polytechnic, Patna" />
    <img className="brand-mark" src="/assets/campus-mark.png" alt="" />
    <span className="brand-text"><b>CAMPUS</b><span className="hi">सहयोग और निवारण</span></span>
  </Link>
);
