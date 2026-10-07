export const branches = [
  ['cse', 'Computer Science & Engineering', 'CSE'],
  ['mechanical', 'Mechanical Engineering', 'Mechanical'],
  ['electrical', 'Electrical Engineering', 'Electrical'],
  ['civil', 'Civil Engineering', 'Civil'],
  ['electronics', 'Electronics Engineering', 'Electronics'],
  ['automobile', 'Automobile Engineering', 'Automobile'],
  ['mop', 'Modern Office Practice', 'Modern Office Practice'],
].map(([id, label, short]) => ({ id, label, short }));
export const semesters = [1, 2, 3, 4, 5, 6];
export const branchLabel = id => branches.find(b => b.id === id)?.short || id || '';
export const channelId = (branch, sem) => `${branch}_${sem}`;
