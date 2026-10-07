import Icon from '../../components/ui/Icon';
const S = [
  ['camera', 'Report with a photo', 'A student describes the problem. The category is suggested automatically.'],
  ['users', 'Assigned', 'Faculty or admin picks it up and assigns an owner. Repeated issues are flagged.'],
  ['wrench', 'In progress', 'The owner adds notes as work happens. Everyone sees the status.'],
  ['check', 'Resolved', 'The student sees the result. The Principal sees the numbers.'],
];
export default function HowItWorks() {
  return (
    <section id="how" className="l-section reveal">
      <h2>How a complaint is tracked</h2>
      <p className="sub">Nothing gets lost: every complaint keeps its owner, time and history.</p>
      <ol className="how">
        {S.map(([i, t, d], k) => <li key={t} style={{ '--k': k }}><span className="how-dot"><Icon name={i} size={20} /></span><h3>{t}</h3><p>{d}</p></li>)}
      </ol>
    </section>
  );
}
