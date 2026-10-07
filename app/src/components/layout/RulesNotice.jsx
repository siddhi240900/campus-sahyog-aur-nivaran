import { Modal, Button } from '../ui/UI';
import Icon from '../ui/Icon';

// Set by the Login page after every successful sign-in; cleared when the student closes the notice.
export const RULES_FLAG = 'campus_show_rules';
export const markRulesPending = () => { try { sessionStorage.setItem(RULES_FLAG, '1'); } catch { /* storage blocked: skip */ } };
export const rulesPending = () => { try { return sessionStorage.getItem(RULES_FLAG) === '1'; } catch { return false; } };
export const clearRulesPending = () => { try { sessionStorage.removeItem(RULES_FLAG); } catch { /* ignore */ } };

export default function RulesNotice({ onClose }) {
  return (
    <Modal title="ज़रूरी नियम · Important rule" onClose={onClose}>
      <div className="stack rules-box">
        <div className="rules-icon"><Icon name="alert" size={30} /></div>
        <p className="hi rules-hi">कॉलेज चैट, शिकायत या किसी भी जगह कोई भी <b>अनावश्यक या ग़लत संदेश</b> न भेजें। ऐसा करने पर <b>सख़्त कार्रवाई</b> की जाएगी।</p>
        <p className="rules-en">Do not send any unnecessary, false or inappropriate message in College chat, complaints or anywhere on CAMPUS. <b>Strict action will be taken</b> against anyone who does.</p>
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>);
}
