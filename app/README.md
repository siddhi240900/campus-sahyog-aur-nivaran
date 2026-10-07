# CAMPUS सहयोग और निवारण

React + Firebase (Auth, Firestore). Roles: Student, Faculty/Admin, Principal.

## Run
```
npm install
npm run dev        # http://localhost:5173
npm run build
```
`.env` has the Firebase keys. `VITE_PRINCIPAL_UID` must equal `principalUid()` in `firestore.rules`.

## One-time Firebase setup
1. Authentication > Sign-in method: enable Email/Password.
2. Firestore > Rules: paste `firestore.rules` and Publish (repeat after every update of the file).
3. Principal: create it in Authentication > Users (Add user), copy its UID into `firestore.rules` and `.env`.
   Log in once. The profile document is created automatically; no manual Firestore document is needed.

## After updating the code
Publish the new `firestore.rules` again (Firestore > Rules > Publish). The faculty approvals page, the "All semesters" chat
channel and the handler designation on complaints need it.

## New in this version (publish firestore.rules again!)
- **Routine image:** faculty/Principal upload a photo of the routine per branch + semester (Routine > Routine image), replace or remove it any time. Day-wise periods still work.
- **गोपनीय शिकायत (Confidential complaint):** students and faculty can report privately. Only the Principal sees and handles it; it never appears in निवारण. The complaint stores no name; the reporter link lives in `confidentialOwners`, readable only by the reporter.
- **Student rules popup:** shown once after every student login; closes with the Close button.

## Account flow
- Student: register, verify email, a faculty member of the same branch approves, then access.
- Faculty/Admin: register, verify email, Principal approves, then access.
- Faculty with branches approve students of those branches. Faculty with no branch can approve students of every branch. The Principal can edit a faculty member's branches.
- Login lasts only while the browser tab/window is open (session persistence), so reopening the app asks for email + password.
- Registration numbers are unique (`regNumbers`). "/" and spaces become "-".

## Notes
- Complaint photos are compressed and stored in Firestore (`complaintPhotos`), so paid Storage is not needed.
- Complaint category, repeated-issue detection and PaperPulse grouping use built-in rules and work without AI.
  To add AI later, host your own endpoint (never put an AI key in the browser) and set `VITE_AI_ENDPOINT` (see `src/lib/ai.js`).
- Theme colours: `src/config/theme.js`. Branches: `src/config/branches.js`.
