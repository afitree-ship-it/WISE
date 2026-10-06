# WISE: Internship and Co-op Portal

WISE is the web portal of the Work-Integrated Science Education Unit, Faculty of Science and Technology, Fatoni University (Thailand). Students use it to find placements and record their internship. Staff use it to track every student through the placement cycle.

It runs entirely on free services: a static React site (for example on Vercel) and a Google Apps Script backend that stores data in a Google Sheet and files in Google Drive. There is no paid server, database or API key. Any faculty with a Google account can run its own copy.

## Features

**Open to everyone, no login**
- Internship schedule with date ranges
- Document centre: PDF forms grouped by category, downloadable
- Placement sites, filterable by major
- Step-by-step checklist for students
- Interface in Thai, English, Arabic and Malay; content entered in Thai is translated automatically

**Students (student ID + 4–6 digit PIN)**
- Profile with photo and placement history
- Logbook: organisation, location on a map, mentor, lodging, coworkers
- Weekly diary (Monday to Sunday)
- Time clock with geofence: the student pins the workplace once, then can clock in and out only within its radius, using server time
- Attendance summary: days present, hours, late, left early
- Mentor evaluation: the student shares a QR code or link, the mentor scores 4 areas from 1 to 5 and the result is calculated automatically

**Staff (password checked on the server)**
- Student status tracking, with supervisors assigned live (field locking prevents two people editing at once)
- Manage schedules, sites and documents
- Drag-and-drop upload of several PDFs at once, saved to Google Drive in folders per category
- Drag to reorder documents
- View each student's logbook, diary, attendance map and evaluations
- Reset a PIN or unlock a workplace pin
- Edit evaluation criteria and the student checklist
- Branding: logo, favicon, site title

## How it works

```
Browser (React 19 + Vite + TypeScript)
   │  GET  public data (sites, schedules, forms, statuses, settings)
   │  POST everything else (text/plain, so no CORS preflight)
   ▼
Google Apps Script web app (code.gs)
   ├── Google Sheet: one tab per data type, private tabs for student records
   └── Google Drive: uploaded PDFs and student photos
```

- Staff writes require the staff password, which the server checks on every request. The password list is never sent to the browser.
- Student PINs are stored as salted SHA-256 hashes. Five wrong PINs lock the account for 15 minutes.
- Student sessions are tokens kept in Apps Script's cache for 6 hours.
- Maps use Leaflet with OpenStreetMap tiles and Nominatim search, so no map API key is needed.

## Set up your own copy

You need a Google account, Node.js 18+, and a free [Vercel](https://vercel.com) account (any static host works).

### 1. Backend (Google Sheet + Apps Script)

1. Create a new Google Sheet.
2. Open **Extensions → Apps Script**, delete the sample code, and paste in the contents of [`code.gs`](code.gs).
3. Create a folder in Google Drive for uploads. In Apps Script open **Project Settings (⚙) → Script Properties → Add script property**, name it `DRIVE_ROOT_ID`, and paste the folder's link or ID as the value. The ID stays out of the code.
4. Choose the function **`setupDrive`** in the toolbar and click **Run**. Google asks for permission: **Review permissions → choose your account → Allow**. If it shows "Google hasn't verified this app", click **Advanced → Go to … (unsafe)**; it is your own script. The execution log should report that the folders are ready.
5. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the web app URL (ending in `/exec`).
7. In the Sheet, add a tab named **`Admins`** with the header `password` in cell A1. Put one staff password per row below it.

The other tabs (Sites, Schedules, Forms, StudentStatuses, Settings and the private student tabs) are created automatically the first time they are used.

When you change `code.gs` later, publish it with **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**, so the URL stays the same.

### 2. Frontend

```bash
git clone https://github.com/afitree-ship-it/WISE.git
cd WISE
npm install
```

Copy [`.env.example`](.env.example) to `.env.local` and put your web app URL in it:

```
VITE_SHEET_API_URL=https://script.google.com/macros/s/XXXX/exec
```

`.env.local` is ignored by git, so the URL is not committed. Then run it locally:

```bash
npm run dev
```

### 3. Deploy

Import the repository into Vercel. It detects Vite automatically: build command `npm run build`, output folder `dist`. Under **Settings → Environment Variables**, add `VITE_SHEET_API_URL` with your web app URL, then redeploy.

The URL is still visible to anyone who opens the site's network requests, as with any public web app. Keeping it out of the repository just means it is not published alongside the code.

### 4. First steps in the admin panel

1. Click **เจ้าหน้าที่** (Staff) on the home page and sign in with a password from the `Admins` tab.
2. Under Settings, set your logo and site title.
3. Add schedules, placement sites and documents.
4. Add students under Status tracking. A student can log in once their student ID appears there; they set their own PIN on first login.

## Adapting it

- **Majors, categories, statuses:** `types.ts` and `constants.ts`
- **UI text and translations:** `constants.ts` (`TRANSLATIONS`) and `components/student/shared.tsx`
- **Colours:** the maroon and gold theme is set with Tailwind classes; search for `#630330`
- **Evaluation criteria and the checklist:** edited in the admin panel, no code changes needed

## Limitations

- Apps Script has [daily quotas](https://developers.google.com/apps-script/guides/services/quotas). These are fine for a faculty of a few hundred students, but this is not built for thousands of concurrent users.
- The geofence relies on the phone's GPS, which a determined user can spoof.
- Uploaded files and photos are shared as "anyone with the link" so the site can show them.
- New student features are translated into Thai and English. Arabic and Malay fall back to English.

## Contributing

Issues and pull requests are welcome. Please test changes against your own Sheet, never a production one.

## License

[MIT](LICENSE)
