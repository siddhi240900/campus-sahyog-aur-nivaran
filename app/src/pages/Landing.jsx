import { useReveal } from '../hooks/useReveal';
import Navbar from './landing/Navbar';
import Hero from './landing/Hero';
import ProblemSolution from './landing/ProblemSolution';
import Features from './landing/Features';
import Roles from './landing/Roles';
import HowItWorks from './landing/HowItWorks';
import Footer from './landing/Footer';

export default function Landing() {
  useReveal();
  return (<div className="landing"><Navbar /><main><Hero /><ProblemSolution /><Features /><Roles /><HowItWorks /></main><Footer /></div>);
}
