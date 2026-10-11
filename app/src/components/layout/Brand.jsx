import { Link } from 'react-router-dom';
export const Brand = ({ to = '/', light }) => (
  <Link to={to} className={`brand ${light ? 'light' : ''}`} aria-label="CAMPUS सहयोग और निवारण home">
    <img className="brand-college" src="/assets/college-logo.png" alt="Government Polytechnic Gulzarbagh" />
    <img className="brand-mark" src="/assets/campus-mark.png" alt="" />
    <span className="brand-text"><b>CAMPUS</b><span className="hi">सहयोग और निवारण</span></span>
  </Link>
);
