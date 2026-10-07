import { branchLabel } from '../config/branches';
import { designationText } from '../config/designations';

// One readable line that identifies a reporter, e.g. "Anita Kumari (21CSE045) · CSE, Semester 3"
// or "Dr. R. Singh · Lecturer · CSE, Civil". Used on confidential complaints (Principal view).
export function describeReporter(reporter) {
  if (!reporter) return 'Reporter not recorded';
  const { name = 'Unknown', role, regNo, branch, semester, designations, branches } = reporter;
  if (role === 'student') {
    return [regNo ? `${name} (${regNo})` : name, [branchLabel(branch), semester ? `Semester ${semester}` : ''].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  }
  return [name, designationText(designations), (branches || []).map(branchLabel).join(', ')].filter(Boolean).join(' · ');
}
