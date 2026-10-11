import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLive } from '../../hooks/useLive';
import { messagesQ, sendMessage, deleteMessage } from '../../services/data';
import { branches, semesters, branchLabel, channelId } from '../../config/branches';
import { displayName } from '../../lib/people';
import { fmtTime, fmtDate, tsMs } from '../../lib/format';
import { readChatFile, formatSize, CHAT_ACCEPT } from '../../lib/chatFile';
import EmojiPicker from '../../components/chat/EmojiPicker';
import ChatAttachment from '../../components/chat/ChatAttachment';
import Icon from '../../components/ui/Icon';
import { PageHeader, Loading, ErrorNote, Empty, useToast } from '../../components/ui/UI';

export default function Chat() {
  const { profile: p, user } = useAuth();
  const toast = useToast();
  const { markSeen, viewingChat } = useNotifications();
  const staff = p.role !== 'student';
  const own = p.role === 'student' ? channelId(p.branch, p.semester) : null;
  const ownAll = p.role === 'student' ? channelId(p.branch, 'all') : null;
  const [channel, setChannel] = useState('global');
  const [bSel, setBSel] = useState(p.branches?.[0] || 'cse');
  const [sSel, setSSel] = useState('all');   // 'all' = every semester of the branch
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState(null);          // photo / PDF waiting to be sent
  const [reading, setReading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const endRef = useRef(); const inputRef = useRef(); const fileRef = useRef();
  const { data, loading, error } = useLive(() => messagesQ(channel), [channel]);
  const msgs = [...data].reverse();
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.length, channel]);
  // Tell the notification centre which channel is on screen, and read it as new messages arrive.
  useEffect(() => { viewingChat(channel); return () => viewingChat(null); }, [channel, viewingChat]);
  useEffect(() => { markSeen(`chat:${channel}`); }, [channel, msgs.length, markSeen]);
  useEffect(() => { setFile(null); setEmojiOpen(false); }, [channel]);

  const send = async e => {
    e.preventDefault(); if ((!text.trim() && !file) || sending) return;
    setSending(true);
    try { await sendMessage(channel, text, p, user.uid, file); setText(''); setFile(null); setEmojiOpen(false); } catch { toast('Message not sent. Try again.', 'err'); } finally { setSending(false); }
  };
  const choose = async e => {
    const picked = e.target.files[0]; e.target.value = ''; if (!picked) return;
    setReading(true);
    try { setFile(await readChatFile(picked)); } catch (err) { toast(err.message || 'Could not attach that file.', 'err'); } finally { setReading(false); }
  };
  // Puts the emoji where the cursor is, keeping the 1000-character limit.
  const addEmoji = emoji => {
    const box = inputRef.current; const start = box?.selectionStart ?? text.length; const end = box?.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${emoji}${text.slice(end)}`; if (next.length > 1000) return;
    setText(next);
    requestAnimationFrame(() => { box?.focus(); box?.setSelectionRange(start + emoji.length, start + emoji.length); });
  };
  const pick = id => setChannel(id);
  const [chBranch, chSem] = channel.split('_');
  const title = channel === 'global' ? 'Global college channel' : `${branchLabel(chBranch)} · ${chSem === 'all' ? 'All semesters' : `Semester ${chSem}`}`;
  let lastDay = '';

  return (<>
    <PageHeader title="College chat" subtitle="Talk with your class, or the whole college." />
    <div className="chat">
      <div className="chat-channels">
        <button className={channel === 'global' ? 'on' : ''} onClick={() => pick('global')}><Icon name="chat" size={17} />Global college</button>
        {own && <button className={channel === own ? 'on' : ''} onClick={() => pick(own)}><Icon name="users" size={17} />{branchLabel(p.branch)} Sem {p.semester}</button>}
        {ownAll && <button className={channel === ownAll ? 'on' : ''} onClick={() => pick(ownAll)}><Icon name="users" size={17} />{branchLabel(p.branch)} · All sems</button>}
        {staff && <div className="chat-pick"><select aria-label="Branch" value={bSel} onChange={e => { setBSel(e.target.value); pick(channelId(e.target.value, sSel)); }}>{branches.map(b => <option key={b.id} value={b.id}>{b.short}</option>)}</select>
          <select aria-label="Semester" value={sSel} onChange={e => { setSSel(e.target.value); pick(channelId(bSel, e.target.value)); }}><option value="all">All sems</option>{semesters.map(s => <option key={s} value={s}>Sem {s}</option>)}</select></div>}
      </div>
      <section className="chat-box" aria-label={title}>
        <div className="chat-title">{title}</div>
        <div className="chat-scroll">
          <ErrorNote error={error} />
          {loading ? <Loading /> : !msgs.length ? <Empty icon="chat" title="No messages yet">Say hello and start the conversation.</Empty> : msgs.map(m => {
            const d = fmtDate(m.createdAt); const sep = d && d !== lastDay; lastDay = d || lastDay; const mine = m.uid === user.uid;
            return (<div key={m.id}>
              {sep && <div className="day-sep"><span>{d}</span></div>}
              <div className={`msg ${mine ? 'mine' : ''}`}>
                <div className="bubble">
                  {!mine && <b className="who">{displayName(m)}{m.role === 'faculty' && <i>Faculty</i>}</b>}
                  {m.attachment && <ChatAttachment channel={channel} attachment={m.attachment} />}
                  {m.text && <p>{m.text}</p>}
                  <small>{tsMs(m.createdAt) ? fmtTime(m.createdAt) : 'sending…'}</small>
                  {staff && <button className="msg-del" onClick={() => deleteMessage(channel, m.id, m.attachment)} aria-label="Delete message"><Icon name="trash" size={14} /></button>}
                </div>
              </div></div>);
          })}
          <div ref={endRef} />
        </div>
        {file && <div className="chat-pending"><Icon name={file.kind === 'image' ? 'image' : 'file'} size={18} /><span>{file.name} · {formatSize(file.size)}</span><button type="button" className="icon-btn" onClick={() => setFile(null)} aria-label="Remove attachment"><Icon name="close" size={16} /></button></div>}
        {emojiOpen && <EmojiPicker onPick={addEmoji} />}
        <form className="chat-input" onSubmit={send}>
          <button type="button" className="icon-btn" onClick={() => setEmojiOpen(o => !o)} aria-label="Emoji" aria-expanded={emojiOpen}><Icon name="smile" size={21} /></button>
          <button type="button" className="icon-btn" onClick={() => fileRef.current?.click()} disabled={reading || !!file} aria-label="Attach a photo or PDF"><Icon name={reading ? 'clock' : 'paperclip'} size={20} /></button>
          <input ref={fileRef} type="file" accept={CHAT_ACCEPT} onChange={choose} hidden />
          <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} maxLength={1000} placeholder={file ? 'Add a caption (optional)' : 'Write a message'} aria-label="Message" />
          <button className="send" disabled={(!text.trim() && !file) || sending} aria-label="Send"><Icon name="send" size={19} /></button>
        </form>
      </section>
    </div>
  </>);
}
