import { useState } from 'react';
import { EMOJI_GROUPS } from '../../config/emojis';

// Small emoji panel. `onPick(emoji)` is called for every tap; the parent decides where the emoji goes.
export default function EmojiPicker({ onPick }) {
  const [group, setGroup] = useState(EMOJI_GROUPS[0].id);
  const current = EMOJI_GROUPS.find(g => g.id === group);
  return (
    <div className="emoji-picker" role="dialog" aria-label="Choose an emoji">
      <div className="emoji-tabs" role="tablist">
        {EMOJI_GROUPS.map(g => <button type="button" key={g.id} role="tab" aria-selected={g.id === group} aria-label={g.title} className={g.id === group ? 'on' : ''} onClick={() => setGroup(g.id)}>{g.label}</button>)}
      </div>
      <div className="emoji-grid">{current.emojis.map(e => <button type="button" key={e} onClick={() => onPick(e)}>{e}</button>)}</div>
    </div>);
}
