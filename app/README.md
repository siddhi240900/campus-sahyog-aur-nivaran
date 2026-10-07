# CAMPUS सहयोग और निवारण

One digital platform for a connected and smarter college (Government Women's Polytechnic, Patna).
React 19 + Vite + Firebase (Auth, Firestore). Three roles: **Student**, **Faculty / Admin**, **Principal**.

## Features
| Area | What it does |
|---|---|
| Dashboard | Role-based overview: notices, today's routine, complaint statistics, approvals |
| Notices | Pinned notices targeted to everyone, a branch or a semester |
| Routine | Upload the routine as an **image** per branch + semester (replace any time), or add day-wise periods |
| Live resources | Free / occupied status of rooms, labs and halls, with release times |
| College chat | Global, branch and semester channels |
| निवारण (Complaints) | Report problems with a photo; Pending → Assigned → In progress → Resolved; repeated-issue detection |
| गोपनीय शिकायत (Confidential) | Private complaints visible **only to the Principal** (and the reporter). The Principal sees who filed it (name, reg. no. / designation, branch) so the case can be resolved. Never shown in निवारण |
| QueueLess | Office service time slots for students |
| PaperPulse | Previous-year papers (upload a question-paper **PDF**, a .txt file, paste text, or type topics) and repeated-concept analysis |
| People & approvals | Students approved by branch faculty, faculty approved by the Principal |
| Student rules notice | Shown once after every student login |

## Project structure
```
app/
├─ firestore.rules          Security rules (publish after every change)
├─ src/
│  ├─ main.jsx              Routes and providers
│  ├─ config/               Constants: branches, categories, statuses, designations, theme
│  ├─ context/              AuthContext (session, profile, role)
│  ├─ routes/guards.jsx     Route guards (login, approval, role)
│  ├─ services/             All Firestore / Auth calls (data.js, users.js, auth.js)
│  ├─ hooks/                useLive (live queries), useReveal
│  ├─ lib/                  Pure helpers: format, image compression, similarity, classifier, reporter
│  ├─ components/           ui/ (Button, Modal, Tabs, StatusTrail…), layout/ (AppShell, AuthShell, RulesNotice)
│  └─ pages/                auth/, app/ (one file per feature), landing/
```
Rule of thumb: pages never call Firebase directly for writes; they use `services/`. Shared UI lives in `components/ui`.

## Run
```
npm install
npm run dev        # http://localhost:5173
npm run build
```
Copy `.env.example` to `.env` and fill in the Firebase keys. `VITE_PRINCIPAL_UID` must equal `principalUid()` in `firestore.rules`.

## One-time Firebase setup
1. Authentication > Sign-in method: enable Email/Password.
2. Firestore > Rules: paste `firestore.rules` and **Publish** (repeat after every update of the file).
3. Create the Principal in Authentication > Users, put its UID in `firestore.rules` and `.env`, then log in once. The profile is created automatically.

## Account flow
- Student: register, verify email, a faculty member of the same branch approves, then access.
- Faculty/Admin: register, verify email, the Principal approves, then access.
- Faculty with branches approve students of those branches; faculty with no branch can approve every branch.
- Login lasts only while the browser tab is open. Registration numbers are unique (`regNumbers`).

## Security notes
- All authorization is enforced in `firestore.rules`, not in the UI. The Principal is identified by UID only.
- Confidential complaints: only the Principal and the reporter can read them; the stored reporter name/role is validated against the reporter's real profile, so nobody can file under another person's name.
- Complaint, routine and photo sizes are limited in the rules. Images are compressed in the browser and stored in Firestore (no paid Storage).
- Never commit `.env`. No AI key belongs in the browser; use your own endpoint via `VITE_AI_ENDPOINT` (`src/lib/ai.js`).

## Conventions
- Components `PascalCase.jsx`, helpers/hooks `camelCase.js`; one page per feature in `pages/app/`.
- Colours only through `src/config/theme.js` / CSS variables in `styles.css`.
- Commit messages follow `type(scope): summary` (`feat`, `fix`, `refactor`, `docs`, `chore`).
