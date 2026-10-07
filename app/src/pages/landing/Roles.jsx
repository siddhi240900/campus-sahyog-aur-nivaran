import Icon from '../../components/ui/Icon';
const R = [
  { icon: 'book', name: 'Student', items: ['Notices for your branch and semester', 'Routine and live room availability', 'Branch chat and the global channel', 'Report problems and track them', 'Your QueueLess slot and PaperPulse'] },
  { icon: 'users', name: 'Faculty / Admin', items: ['Post notices and upload routines', 'Update room status in seconds', 'Assign and resolve complaints', 'Give students time slots', 'Needs Principal approval first'] },
  { icon: 'shield', name: 'Principal', items: ['Approves every admin account', 'Creates classrooms, labs and halls', 'Live complaint statistics', 'College-wide notices', 'A real-time view of the whole campus'], dark: true },
];
export default function Roles() {
  return (
    <section id="roles" className="l-section reveal">
      <h2>Made for each person on campus</h2>
      <div className="role-grid">
        {R.map(r => (
          <article key={r.name} className={`role ${r.dark ? 'dark' : ''}`}>
            <Icon name={r.icon} size={26} /><h3>{r.name}</h3>
            <ul>{r.items.map(i => <li key={i}><Icon name="check" size={16} />{i}</li>)}</ul>
          </article>))}
      </div>
    </section>
  );
}
