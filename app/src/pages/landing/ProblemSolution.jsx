import Icon from '../../components/ui/Icon';
export default function ProblemSolution() {
  return (
    <section className="l-strip reveal" aria-label="From scattered to connected">
      <div className="from">
        <h2>Today</h2>
        <ul><li>Notices buried in WhatsApp groups</li><li>Paper notices on a busy board</li><li>Complaints nobody tracks</li><li>Hours in queues for scholarship work</li></ul>
      </div>
      <div className="mid"><Icon name="arrow" size={30} /></div>
      <div className="to">
        <h2>One connected campus</h2>
        <p>Every notice, room, complaint and slot has an owner, a time and a status, and the Principal sees it all live.</p>
      </div>
    </section>
  );
}
