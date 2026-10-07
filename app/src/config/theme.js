// One place for the theme. Change a colour here and it updates everywhere.
export const theme = {
  deepGreen: '#0B4A2E',
  leafGreen: '#5FA84A',
  gold: '#B8963E',
  cream: '#FAF8F2',
  ink: '#17261D',
  pending: '#B8963E',
  assigned: '#3E7CA6',
  progress: '#C9772B',
  resolved: '#5FA84A',
  danger: '#B4443A',
};
export function applyTheme() {
  const r = document.documentElement.style;
  r.setProperty('--green', theme.deepGreen);
  r.setProperty('--leaf', theme.leafGreen);
  r.setProperty('--gold', theme.gold);
  r.setProperty('--cream', theme.cream);
  r.setProperty('--ink', theme.ink);
  r.setProperty('--st-pending', theme.pending);
  r.setProperty('--st-assigned', theme.assigned);
  r.setProperty('--st-progress', theme.progress);
  r.setProperty('--st-resolved', theme.resolved);
  r.setProperty('--danger', theme.danger);
}
