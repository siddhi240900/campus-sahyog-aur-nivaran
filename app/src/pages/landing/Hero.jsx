import { Link } from 'react-router-dom';
import { StatusTrail } from '../../components/ui/UI';
import Icon from '../../components/ui/Icon';

export default function Hero() {
  return (
    <section className="l-hero">
      <div className="l-hero-copy">
        <h1>One Digital Platform for a Connected and Smarter College</h1>
        <p className="lead">Notices, routines, free rooms, complaints and scholarship slots for Government Women’s Polytechnic, Patna, all in one place instead of scattered chats and paper.</p>
        <p className="hi lead-hi">सूचना, सुविधा और शिकायत: सब एक ही जगह।</p>
        <div className="l-cta">
          <Link to="/register" className="btn gold lg">Register</Link>
          <Link to="/login" className="btn outline lg">Login</Link>
        </div>
      </div>
      <div className="l-hero-art" aria-hidden="true">
        <img className="l-hero-logo" src="/assets/campus-logo.png" alt="" />
        <div className="float f-res"><span className="dot-free" /><div><b>Computer Lab 2</b><small>Available now</small></div></div>
        <div className="float f-notice"><Icon name="bell" size={18} /><div><b>Scholarship verification</b><small>Your slot: Tue, 10:20 AM</small></div></div>
        <div className="float f-trail"><b>Projector, Room 104</b><StatusTrail status="in_progress" compact /></div>
      </div>
    </section>
  );
}
