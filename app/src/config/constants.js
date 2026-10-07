// Must match principalUid() in firestore.rules
export const PRINCIPAL_UID = import.meta.env.VITE_PRINCIPAL_UID || '20WAn1MHd1bBw8ee7jyjCYWPmEh1';

export const COMPLAINT_STATUSES = [
  { id: 'pending', label: 'Pending' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'resolved', label: 'Resolved' },
];
export const statusLabel = id => COMPLAINT_STATUSES.find(s => s.id === id)?.label || id;

export const CATEGORIES = [
  { id: 'computer', label: 'Computers & PCs' },
  { id: 'projector', label: 'Projector / AV' },
  { id: 'electricity', label: 'Electricity' },
  { id: 'water', label: 'Water' },
  { id: 'sanitation', label: 'Sanitation & cleanliness' },
  { id: 'furniture', label: 'Furniture & building' },
  { id: 'network', label: 'Internet / Wi-Fi' },
  { id: 'other', label: 'Other' },
];
export const categoryLabel = id => CATEGORIES.find(c => c.id === id)?.label || 'Other';

export const RESOURCE_TYPES = [
  { id: 'classroom', label: 'Classroom' },
  { id: 'lab', label: 'Lab' },
  { id: 'library', label: 'Library' },
  { id: 'seminar', label: 'Seminar hall' },
];
export const typeLabel = id => RESOURCE_TYPES.find(t => t.id === id)?.label || id;

export const SERVICES = [
  { id: 'scholarship', label: 'Scholarship', docs: ['Aadhaar card', 'Income certificate', 'Bank passbook copy', 'Previous marksheet'] },
  { id: 'certificate', label: 'Certificate', docs: ['College ID card', 'Fee receipt', 'Application form'] },
  { id: 'verification', label: 'Document verification', docs: ['Original marksheets', 'Photocopies (2 sets)', 'College ID card'] },
  { id: 'other', label: 'Other service', docs: ['College ID card'] },
];
export const serviceLabel = id => SERVICES.find(s => s.id === id)?.label || id;

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Confidential complaints (handled only by the Principal)
export const CONF_CATEGORIES = [
  { id: 'harassment', label: 'Harassment / teasing' },
  { id: 'ragging', label: 'Ragging / bullying' },
  { id: 'misconduct', label: 'Staff or student misconduct' },
  { id: 'discrimination', label: 'Discrimination / unfair treatment' },
  { id: 'safety', label: 'Safety concern' },
  { id: 'other', label: 'Something else' },
];
export const confCategoryLabel = id => CONF_CATEGORIES.find(c => c.id === id)?.label || 'Something else';
export const CONF_STATUSES = [
  { id: 'pending', label: 'Received' },
  { id: 'in_progress', label: 'Under review' },
  { id: 'resolved', label: 'Resolved' },
];
export const confStatusLabel = id => CONF_STATUSES.find(s => s.id === id)?.label || id;
