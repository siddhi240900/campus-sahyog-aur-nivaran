import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLive } from '../../hooks/useLive';
import { papersQ, savePaper, deletePaper, loadPaperFile } from '../../services/data';
import { analysePapers, splitQuestions } from '../../lib/paperpulse';
import { readPaperFile, dataUrlToBlob, MAX_FILES, MAX_TOTAL_CHARS } from '../../lib/paperFile';
import { branches, semesters } from '../../config/branches';
import { displayName } from '../../lib/people';
import Icon from '../../components/ui/Icon';
import FileView from '../../components/FileView';
import { Button, Input, Select, Textarea, Modal, PageHeader, Empty, Loading, ErrorNote, Badge, Tabs, useToast } from '../../components/ui/UI';

const thisYear = new Date().getFullYear();

function Upload({ onClose, defaults, papers }) {
  const { profile: p, user } = useAuth(); const toast = useToast();
  const [f, setF] = useState({ branch: defaults.branch, semester: defaults.semester, subject: '', year: thisYear - 1 });
  const [mode, setMode] = useState('quick');          // quick = type short topics, file = attach PDF / photos (only shown, never scanned), paste = paste the whole paper text
  const [items, setItems] = useState([]);             // the questions / topics that will be saved
  const [files, setFiles] = useState([]);             // attached PDF / photos of the paper
  const [topic, setTopic] = useState(''); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [reading, setReading] = useState(''); // '' = idle, otherwise the progress message

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
  const addQuestionsFrom = (raw, source = 'text') => {
    const found = splitQuestions(raw);
    if (!found.length) return toast(`No questions found in that ${source}.`, 'err');
    add(found); setText(''); toast(`${found.length} question${found.length === 1 ? '' : 's'} found. Remove any that are wrong.`);
  };
  const findQuestions = () => addQuestionsFrom(text);
  // The PDF / photos are only attached and shown to students. Nothing is scanned or turned into text.
  const attach = async e => {
    const picked = [...e.target.files]; e.target.value = ''; if (!picked.length) return;
    if (files.length + picked.length > MAX_FILES) return toast(`You can attach up to ${MAX_FILES} files to one paper.`, 'err');
    setReading('Preparing the file…');
    try {
      const next = [...files]; for (const file of picked) next.push(await readPaperFile(file));
      if (next.reduce((n, x) => n + x.data.length, 0) > MAX_TOTAL_CHARS) throw new Error('These files are too big together. Attach fewer pages or smaller files.');
      setFiles(next);
    } catch (err) { toast(err.message || 'Could not attach that file.', 'err'); }
    finally { setReading(''); }
  };
  const loadTextFile = async e => { const file = e.target.files[0]; e.target.value = ''; if (file) setText(await file.text()); };

  const submit = async e => {
    e.preventDefault();
    const pending = topic.trim() ? [...items, ...topic.split(/[,;\n]+/).map(x => x.trim()).filter(x => x.length > 2)] : items;   // topic typed but "Add" not pressed
    if (!pending.length && !files.length) return toast('Attach the paper (PDF / photo) or add at least one topic.', 'err'); setBusy(true);
    try { await savePaper({ branch: f.branch, semester: Number(f.semester), subject: f.subject.trim(), year: Number(f.year), questions: [...new Set(pending)] }, { uid: user.uid, name: displayName(p) }, files); toast('Paper saved'); onClose(); }
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

        <Tabs value={mode} onChange={setMode} options={[{ id: 'quick', label: 'Quick topics' }, { id: 'file', label: 'Upload PDF / photo' }, { id: 'paste', label: 'Paste text' }]} />
        {mode === 'quick' ? <>
          <div className="assign-row">
            <Input label="Topic asked in this paper" placeholder="e.g. Linked list types" value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }} hint="Type a few words, press Enter. Add several at once with commas. No need to write the full question." />
            <Button type="button" variant="outline" onClick={addTopic}>Add</Button>
          </div>
          {suggestions.length > 0 && <div><small className="muted">Asked in earlier years. Tap to add:</small><div className="chips">{suggestions.map(sg => <button type="button" key={sg} className="chip" onClick={() => add([sg])}>+ {sg}</button>)}</div></div>}
        </> : mode === 'file' ? <>
          <label className={`btn primary ${reading ? 'is-busy' : ''}`}><Icon name="upload" size={16} />{reading || 'Choose PDF or photo of the paper'}<input type="file" accept=".pdf,application/pdf,image/*" multiple onChange={attach} disabled={!!reading} hidden /></label>
          <small className="muted">The file is saved as it is and students see it exactly like the original. Nothing is scanned or converted. PDF up to 5 MB, or up to {MAX_FILES} photos of the pages. You can also type topics in the Quick topics tab.</small>
        </> : <>
          <label className="btn outline"><Icon name="upload" size={16} />Load a .txt file<input type="file" accept=".txt,.md,.csv,text/plain" onChange={loadTextFile} hidden /></label>
          <Textarea label="Paste the paper text" rows={7} value={text} onChange={e => setText(e.target.value)} placeholder={'Copy the whole question paper from the PDF or Word file and paste it here.\nQ1. Explain the types of linked list.\nQ2. Define stack and write its applications.'} hint="Question numbers, marks and broken lines are cleaned up automatically." />
          <div className="row-btns"><Button type="button" variant="outline" onClick={findQuestions} disabled={!text.trim()}>Find questions</Button></div>
        </>}

        {files.length > 0 && <div><b className="h-sm">{files.length} file{files.length > 1 ? 's' : ''} attached</b>
          <ul className="list">{files.map((f, i) => <li key={i}><Icon name="file" size={16} /><div><span>{f.name}</span></div><button type="button" className="icon-btn" onClick={() => setFiles(files.filter((_, k) => k !== i))} aria-label={`Remove ${f.name}`}><Icon name="close" size={16} /></button></li>)}</ul></div>}
        {items.length > 0 && <div><b className="h-sm">{items.length} added</b>
          <ul className="list">{items.map((q, i) => <li key={q}><div><span>{q}</span></div><button type="button" className="icon-btn" onClick={() => setItems(items.filter((_, k) => k !== i))} aria-label={`Remove ${q}`}><Icon name="close" size={16} /></button></li>)}</ul></div>}
        <Button type="submit" loading={busy}>Save paper</Button>
      </form>
    </Modal>);
}

// Shows a paper to everyone: the attached PDF / photos exactly as uploaded, plus any topics the teacher typed.
function Viewer({ paper, onClose }) {
  const [blobs, setBlobs] = useState(null); const [err, setErr] = useState('');
  const files = paper.files || [];
  useEffect(() => {
    let live = true;
    Promise.all(files.map((f, i) => loadPaperFile(paper.id, f, i).then(dataUrlToBlob)))
      .then(r => live && setBlobs(r)).catch(() => live && setErr('Could not load the attached file. Check your internet and try again.'));
    return () => { live = false; };
  }, [paper.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const topics = paper.questions || [];
  return (
    <Modal wide title={`${paper.subject} · ${paper.year}`} onClose={onClose}>
      <div className="stack">
        {files.length > 0 && (err ? <p className="error">{err}</p> : !blobs ? <Loading /> : blobs.map((b, i) => <FileView key={i} blob={b} type={files[i].type} name={files[i].name} />))}
        {topics.length > 0 && <div><b className="h-sm">{files.length ? 'Topics added by faculty' : 'Topics asked in this paper'}</b><ul className="pp-topics">{topics.map(q => <li key={q}>{q}</li>)}</ul></div>}
        {!files.length && !topics.length && <p className="muted">Nothing was added to this paper.</p>}
      </div>
    </Modal>);
}

export default function PaperPulse() {
  const { profile: p } = useAuth(); const toast = useToast();
  const staff = p.role !== 'student';
  const { data, loading, error } = useLive(papersQ, []);
  const [branch, setBranch] = useState(p.branch || p.branches?.[0] || 'cse'); const [sem, setSem] = useState(p.semester || 1);
  const [subject, setSubject] = useState(''); const [tab, setTab] = useState('topics'); const [open, setOpen] = useState(false); const [viewing, setViewing] = useState(null);

  const scope = data.filter(x => x.branch === branch && x.semester === sem);
  const subjects = [...new Set(scope.map(x => x.subject))].sort();
  const active = subject && subjects.includes(subject) ? subject : subjects[0] || '';
  const papers = scope.filter(x => x.subject === active);
  const res = useMemo(() => analysePapers(papers), [papers]);
  const shownTab = tab === 'topics' && res.totalQuestions === 0 && papers.length ? 'papers' : tab;   // papers that only have a file have no topics to analyse
  const remove = async x => { if (confirm('Delete this paper?')) { try { await deletePaper(x.id, x.files); toast('Paper deleted'); } catch { toast('Could not delete.', 'err'); } } };

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
      <Tabs value={shownTab} onChange={setTab} options={[{ id: 'topics', label: 'Repeated concepts' }, { id: 'years', label: 'Year-wise pattern' }, { id: 'papers', label: 'Papers' }]} />
      {shownTab === 'topics' && <div className="topics">{res.clusters.filter(c => c.years.length > 1 || res.years.length === 1).map(c => (
        <details key={c.label + c.count} className="topic">
          <summary><div><b>{c.label}</b><small>{c.keywords.join(' · ')}</small></div><div className="chips">{c.hot && <Badge tone="gold">Frequently asked</Badge>}<Badge tone="assigned">{c.years.length} year{c.years.length > 1 ? 's' : ''}</Badge><Badge>{c.count} questions</Badge></div></summary>
          <ul>{c.items.sort((a, b) => b.year - a.year).map((i, k) => <li key={k}><b>{i.year}</b><span>{i.text}</span></li>)}</ul>
        </details>))}
        {!res.repeated.length && res.years.length > 1 && <Empty icon="chart" title="No concept repeats yet">Add more years to find repeated concepts.</Empty>}
      </div>}
      {shownTab === 'years' && (res.clusters.length ? <div className="matrix-wrap"><table className="matrix"><thead><tr><th>Concept</th>{res.years.map(y => <th key={y}>{y}</th>)}</tr></thead>
        <tbody>{res.clusters.slice(0, 40).map(c => <tr key={c.label + c.count}><th scope="row">{c.label}</th>{res.years.map(y => { const n = c.items.filter(i => i.year === y).length; return <td key={y} className={n ? 'hit' : ''}>{n || ''}</td>; })}</tr>)}</tbody></table></div> : null)}
      {shownTab === 'papers' && <ul className="list">{[...papers].sort((a, b) => b.year - a.year).map(x => <li key={x.id}><Icon name="file" size={16} /><div><b>{x.subject} · {x.year}</b><small>{[x.files?.length ? `${x.files.length} file${x.files.length > 1 ? 's' : ''}` : '', (x.questions || []).length ? `${x.questions.length} topic${x.questions.length > 1 ? 's' : ''}` : '', `added by ${x.uploadedBy}`].filter(Boolean).join(' · ')}</small></div><button className="btn outline sm" onClick={() => setViewing(x)}><Icon name="eye" size={15} />View</button>{staff && <button className="icon-btn" onClick={() => remove(x)} aria-label="Delete paper"><Icon name="trash" size={17} /></button>}</li>)}</ul>}
    </>)}
    {viewing && <Viewer paper={viewing} onClose={() => setViewing(null)} />}
    {open && <Upload onClose={() => setOpen(false)} defaults={{ branch, semester: sem }} papers={data} />}
  </>);
}
