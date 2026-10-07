import Icon from '../../components/ui/Icon';
const F = [
  ['chat', 'College Chat', 'Branch and semester channels, plus one for the whole college.'],
  ['bell', 'Notices & Dashboard', 'Notices for your branch or semester, with updates on one screen.'],
  ['calendar', 'Routine', 'Faculty upload timetables; students always see the latest one.'],
  ['door', 'Live Resource Availability', 'See which classroom, lab or hall is free, who has it and until when.'],
  ['wrench', 'निवारण (Complaints)', 'Report with a photo and follow it from Pending to Resolved.'],
  ['ticket', 'QueueLess', 'Exact time slots for scholarship, certificate and verification work.'],
  ['chart', 'PaperPulse', 'Find repeated concepts across previous-year question papers.'],
  ['shield', 'Admin & Principal Dashboard', 'Live complaint numbers, resources and services in one view.'],
];
export default function Features() {
  return (
    <section id="features" className="l-section reveal">
      <h2>Everything the campus runs on, connected</h2>
      <p className="sub">A timetable links to a room, a room problem becomes a complaint, and the right person is notified.</p>
      <div className="feat-grid">
        {F.map(([i, t, d]) => <article key={t} className="feat"><span className="feat-ic"><Icon name={i} size={24} /></span><h3 className={t.includes('निवारण') ? 'hi' : ''}>{t}</h3><p>{d}</p></article>)}
      </div>
    </section>
  );
}
