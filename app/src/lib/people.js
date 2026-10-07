// How a person's name is shown. The Principal is the head of the college, so wherever the name appears it carries the
// "Principal" salutation, which lets everyone identify the post at a glance. Other roles keep their plain name.
export const PRINCIPAL_SALUTATION = 'Principal';

// person: { name, role }. Safe to call twice: a name that already starts with the salutation is left alone.
export function displayName({ name = '', role } = {}) {
  const clean = name.trim();
  if (role !== 'principal') return clean;
  if (!clean) return PRINCIPAL_SALUTATION;
  return /^principal\b/i.test(clean) ? clean : `${PRINCIPAL_SALUTATION} ${clean}`;
}
