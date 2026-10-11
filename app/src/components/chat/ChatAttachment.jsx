import { useEffect, useState } from 'react';
import Icon from '../ui/Icon';
import { Modal, Loading } from '../ui/UI';
import FileView from '../FileView';
import { loadChatFile } from '../../services/data';
import { dataUrlToBlob } from '../../lib/paperFile';
import { formatSize } from '../../lib/chatFile';

const MIME = { image: 'image/jpeg', pdf: 'application/pdf' };

// Loads the full file only when someone opens it, then shows it in a window (photo, or every page of a PDF).
function AttachmentViewer({ channel, attachment, onClose }) {
  const [blob, setBlob] = useState(null); const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    loadChatFile(channel, attachment).then(url => live && setBlob(dataUrlToBlob(url))).catch(err => live && setError(err.message || 'Could not open this file.'));
    return () => { live = false; };
  }, [channel, attachment]);
  return (
    <Modal wide title={attachment.name} onClose={onClose}>
      {error ? <p className="error">{error}</p> : !blob ? <Loading /> : <FileView blob={blob} type={MIME[attachment.kind]} name={attachment.name} />}
    </Modal>);
}

// The photo or PDF inside a chat bubble. Photos show their small preview; a tap opens the full file.
export default function ChatAttachment({ channel, attachment }) {
  const [open, setOpen] = useState(false);
  return (<>
    {attachment.kind === 'image' && attachment.thumb
      ? <button type="button" className="chat-photo" onClick={() => setOpen(true)} aria-label={`Open photo ${attachment.name}`}><img src={attachment.thumb} alt={attachment.name} /></button>
      : <button type="button" className="chat-file" onClick={() => setOpen(true)}><Icon name="file" size={20} /><span><b>{attachment.name}</b><small>{attachment.kind === 'pdf' ? 'PDF' : 'Photo'} · {formatSize(attachment.size)} · Tap to open</small></span></button>}
    {open && <AttachmentViewer channel={channel} attachment={attachment} onClose={() => setOpen(false)} />}
  </>);
}
