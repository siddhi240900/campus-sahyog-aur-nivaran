import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLive } from '../../hooks/useLive';
import { papersQ, savePaper, deletePaper } from '../../services/data';
import { analysePapers, splitQuestions } from '../../lib/paperpulse';
import { branches, semesters, branchLabel } from '../../config/branches';
import Icon from '../../components/ui/Icon';
import { Button, Input, Select, Textarea, Modal, PageHeader, Empty, Loading, ErrorNote, Badge, Tabs, useToast } from '../../components/ui/UI';

const thisYear = new Date().getFullYear();

function Upload({ onClose, defaults, papers }) {
  const { profile: p, user } = useAuth(); const toast = useToast();
  const [f, setF] = useState({ branch: defaults.branch, semester: defaults.semester, subject: '', year: thisYear - 1 });
  const [mode, setMode] = useState('quick');          // quick = type short topics, paste = paste the whole paper text
  const [items, setItems] = useState([]);             // the questions / topics that will be saved
  const [topic, setTopic] = useState(''); const [text, setText] = useState(''); const [busy, setBusy] = useState(false);

  // Earlier papers of the same branch + semester: reuse their subjects and topics instead of retyping.
  const same = papers.filter(x => x.branch === f.branch && x.semester === Number(f.semester));
  const subjects = [...new Set(same.map(x => x.subject))].sort();
  const suggestions = useMemo(() => {
    const subj = f.subject.trim().toLowerCase(); if (!subj) return [];
    const count = new Map(); const have = new Set(items.map(i => i.toLowerCase()));
    same.filter(x => x.subject.toLowerCase() === subj).forEach(x => (x.questions || []).forEach(q => { const k = q.toLowerCase(); if (!have.has(k)) count.set(q, (count.get(q) || 0) + 1); }));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(e => e[0]);
  }, [same, f.subject, items]);

  const add = list => setItems(cur => { const seen = new Set(cur.map(x => x.toLowerCase())); const next = [...cur]; list.forEach(x => { const t = x.trim(); if (t.length > 2 && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); next.push(t); } }); return next; });
  const addTopic = () => { if (topic.trim()) { add(topic.split(/[,;\n]+/)); setTopic(''); } };
  const findQuestions = () => { const q = splitQuestions(text); if (!q.length) return toast('No questions found in that text.', 'err'); add(q); setText(''); toast(`${q.length} question${q.length === 1 ? '' : 's'} found. Remove any that are wrong.`); };
  const loadFile = async e => { const file = e.target.files[0]; e.target.value = ''; if (!file) return; try { setText(await file.text()); } catch { toast('Could not read that file. Copy the text and paste it instead.', 'err'); } };

  const submit = async e => {
    e.preventDefault();
    const pending = topic.trim() ? [...items, ...topic.split(/[,;\n]+/).map(x => x.trim()).filter(x => x.length > 2)] : items;   // topic typed but "Add" not pressed
    if (!pending.length) return toast('Add at least one topic or question.', 'err'); setBusy(true);
    try { await savePaper({ branch: f.branch, semester: Number(f.semester), subject: f.subject.trim(), year: Number(f.year), questions: [...new Set(pending)] }, { uid: user.uid, name: p.name }); toast(`${pending.length} added`); onClose(); }
    catch (err) { toast(err.message, 'err'); setBusy(false); }
  };
  return (
    <Modal wide title="Add a previous-year paper" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <div className="two"><Select label="Branch" value={f.branch} onChange={e => setF({ ...f, branch: e.target.value })}>{branches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</Select>
          <Select label="Semester" value={f.semester} onChange={e => setF({ ...f, semester: e.target.value })}>{semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}</Select></div>
        <div className="two"><Input label="Subject" required list="pp-subjects" placeholder="e.g. Data Structures" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} />
          <Input label="Exam year" type="number" min="2000" max={thisYear} required value={f.year} onChange={e => setF({ ...f, year: e.target.value })} /></div>
        <datalist id="pp-subjects">{subjects.map(s => <option key={s} value={s} />)}</datalist>

        <Tabs value={mode} onChange={setMode} options={[{ id: 'quick', label: 'Quick topics' }, { id: 'paste', label: 'Paste paper text' }]} />
        {mode === 'quick' ? <>
          <div className="assign-row">
            <Input label="Topic asked in this paper" placeholder="e.g. Linked list types" value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }} hint="Type a few words, press Enter. Add several at once with commas. No need to write the full question." />
            <Button type="button" variant="outline" onClick={addTopic}>Add</Button>
          </div>
          {suggestions.length > 0 && <div><small className="muted">Asked in earlier years. Tap to add:</small><div className="chips">{suggestions.map(sg => <button type="button" key={sg} className="chip" onClick={() => add([sg])}>+ {sg}</button>)}</div></div>}
        </> : <>
          <Textarea label="Paper text" rows={7} value={text} onChange={e => setText(e.target.value)} placeholder={'Copy the whole question paper from the PDF or Word file and paste it here.\nQ1. Explain the types of linked list.\nQ2. Define stack and write its applications.'} hint="Question numbers, marks and broken lines are cleaned up automatically." />
          <div className="row-btns"><Button type="button" variant="outline" onClick={findQuestions} disabled={!text.trim()}>Find questions</Button>
            <label className="btn outline">Load .txt file<input type="file" accept=".txt,.md,.csv,text/plain" onChange={loadFile} hidden /></label></div>
        </>}

        {items.length > 0 && <div><b className="h-sm">{items.length} added</b>
          <ul className="list">{items.map((q, i) => <li key={q}><div><span>{q}</span></div><button type="button" className="icon-btn" onClick={() => setItems(items.filter((_, k) => k !== i))} aria-label={`Remove ${q}`}><Icon name="close" size={16} /></button></li>)}</ul></div>}
        <Button type="submit" loading={busy}>Save paper</Button>
      </form>
    </Modal>);
}

export default function PaperPulse() {
  const { profile: p } = useAuth(); const toast = useToast();
  const staff = p.role !== 'student';
  const { data, loading, error } = useLive(papersQ, []);
  const [branch, setBranch] = useState(p.branch || p.branches?.[0] || 'cse'); const [sem, setSem] = useState(p.semester || 1);
  const [subject, setSubject] = useState(''); const [tab, setTab] = useState('topics'); const [open, setOpen] = useState(false);

  const scope = data.filter(x => x.branch === branch && x.semester === sem);
  const subjects = [...new Set(scope.map(x => x.subject))].sort();
  const active = subject && subjects.includes(subject) ? subject : subjects[0] || '';
  const papers = scope.filter(x => x.subject === active);
  const res = useMemo(() => analysePapers(papers), [papers]);
  const remove = async id => { if (confirm('Delete this paper?')) { try { await deletePaper(id); toast('Paper deleted'); } catch { toast('Could not delete.', 'err'); } } };

  return (<>
    <PageHeader title="PaperPulse" subtitle="See which concepts keep coming back in previous-year papers, even when the wording changes." actions={staff && <Button icon="plus" onClick={() => setOpen(true)}>Add paper</Button>} />
    <div className="filters">
      <Select label="Branch" value={branch} onChange={e => { setBranch(e.target.value); setSubject(''); }}>{branches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</Select>
      <Select label="Semester" value={sem} onChange={e => { setSem(Number(e.target.value)); setSubject(''); }}>{semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}</Select>
      <Select label="Subject" value={active} onChange={e => setSubject(e.target.value)}>{!subjects.length && <option value="">No subjects yet</option>}{subjects.map(s => <option key={s}>{s}</option>)}</Select>
    </div>
    <ErrorNote error={error} />
    {loading ? <Loading /> : !papers.length ? <Empty icon="chart" title="No papers for this selection" action={staff && <Button onClick={() => setOpen(true)}>Add a paper</Button>}>{staff ? 'Add previous-year questions to see repeated concepts.' : 'Faculty have not added papers for this branch and semester yet.'}</Empty> : (<>
      <div className="stats small">
        <div className="stat"><span className="stat-label">Papers</span><b className="stat-value">{papers.length}</b><small>{res.years.join(', ')}</small></div>
        <div className="stat"><span className="stat-label">Questions</span><b className="stat-value">{res.totalQuestions}</b></div>
        <div className="stat resolved"><span className="stat-label">Repeated concepts</span><b className="stat-value">{res.repeated.length}</b><small>asked in 2+ years</small></div>
      </div>
      <Tabs value={tab} onChange={setTab} options={[{ id: 'topics', label: 'Repeated concepts' }, { id: 'years', label: 'Year-wise pattern' }, ...(staff ? [{ id: 'papers', label: 'Papers' }] : [])]} />
      {tab === 'topics' && <div className="topics">{res.clusters.filter(c => c.years.length > 1 || res.years.length === 1).map(c => (
        <details key={c.label + c.count} className="topic">
          <summary><div><b>{c.label}</b><small>{c.keywords.join(' · ')}</small></div><div className="chips">{c.hot && <Badge tone="gold">Frequently asked</Badge>}<Badge tone="assigned">{c.years.length} year{c.years.length > 1 ? 's' : ''}</Badge><Badge>{c.count} questions</Badge></div></summary>
          <ul>{c.items.sort((a, b) => b.year - a.year).map((i, k) => <li key={k}><b>{i.year}</b><span>{i.text}</span></li>)}</ul>
        </details>))}
        {!res.repeated.length && res.years.length > 1 && <Empty icon="chart" title="No concept repeats yet">Add more years to find repeated concepts.</Empty>}
      </div>}
      {tab === 'years' && (res.clusters.length ? <div className="matrix-wrap"><table className="matrix"><thead><tr><th>Concept</th>{res.years.map(y => <th key={y}>{y}</th>)}</tr></thead>
        <tbody>{res.clusters.slice(0, 40).map(c => <tr key={c.label + c.count}><th scope="row">{c.label}</th>{res.years.map(y => { const n = c.items.filter(i => i.year === y).length; return <td key={y} className={n ? 'hit' : ''}>{n || ''}</td>; })}</tr>)}</tbody></table></div> : null)}
      {tab === 'papers' && <ul className="list">{[...papers].sort((a, b) => b.year - a.year).map(x => <li key={x.id}><Icon name="file" size={16} /><div><b>{x.subject} · {x.year}</b><small>{x.questions.length} questions · added by {x.uploadedBy}</small></div><button className="icon-btn" onClick={() => remove(x.id)} aria-label="Delete paper"><Icon name="trash" size={17} /></button></li>)}</ul>}
    </>)}
    {open && <Upload onClose={() => setOpen(false)} defaults={{ branch, semester: sem }} papers={data} />}
  </>);
}
