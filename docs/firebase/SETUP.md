# Firebase setup for live polls (Phase 9)

The new dashboard keeps using project **`studentpoll-a9e39`** and its Realtime Database, with the same data layout as the old one. It needs two console changes. Until you make them, polls still work the old, open way.

## 1. Turn on anonymous sign-in (about 1 minute)

The teacher's board signs in anonymously and invisibly, which lets the rules say "only the board that made a room can change it". Students don't sign in.

1. Open https://console.firebase.google.com/ and pick **studentpoll-a9e39**.
2. In the left menu, open **Build → Authentication**. If you see **Get started**, click it.
3. Open the **Sign-in method** tab.
4. Click **Anonymous**, switch **Enable** on, and click **Save**.

## 2. Replace the database rules (about 2 minutes)

1. In the left menu, open **Build → Realtime Database**, then the **Rules** tab.
2. Copy what's there now into a text file somewhere safe, in case you need to go back.
3. Delete everything in the editor and paste the whole of [`database.rules.json`](database.rules.json).
4. Click **Publish**.

### What the rules do

- **Rooms made by the new board** can only be changed by that board. Students can read a room's question and add **one new vote at a time**, only while that poll is running, only of the poll's type, and with answers of at most 100 characters.
- **Rooms made by the old dashboard** (no owner) keep working exactly as before, so the live site at `/dashboard/` isn't affected until the cutover in Phase 14.
- **Poll archives** from the new board are kept under `archives/<your board's id>`, readable only by that board.
- **Old rooms are cleaned up:** anyone may delete a room nobody has opened for 7 days, and the new board does this automatically, up to 20 rooms each time it opens a poll.
- Everything else in the database is closed.

### Optional check

The **Rules playground** button on the Rules tab lets you simulate requests. For example, a **read** of `/rooms/12345/meta` as an unauthenticated user should be **allowed**, and a **write** to `/rooms/12345/currentPoll` for a room with a `meta/ownerUid` should be **denied**.

## 3. Sync between devices (Phase 13, about 5 minutes)

Sync is optional and off until you sign in from **Settings → Sync between devices**. It needs Google sign-in and a Firestore database.

### Turn on Google sign-in

1. **Build → Authentication → Sign-in method → Add new provider → Google**.
2. Switch **Enable** on, choose your email as the **project support email**, and click **Save**.
3. Open the **Settings** tab (still in Authentication) → **Authorized domains** → **Add domain**, type `nagasakimark.github.io`, and click **Add**. (`localhost` is already there, which is enough for testing on your PC.)

### Let the sign-in window use the API key

The project's API key only accepts requests from listed websites. Firebase's sign-in window ("Try Firebase's sign-in window" in Settings) runs on `studentpoll-a9e39.firebaseapp.com`, so that site must be on the list too, or sign-in fails with "Requests from referer https://studentpoll-a9e39.firebaseapp.com/… are blocked".

1. Open https://console.cloud.google.com/apis/credentials?project=studentpoll-a9e39 (same Google account as Firebase).
2. Under **API Keys**, click the key named **Browser key (auto created by Firebase)** (it starts `AIzaSyASFX…`).
3. Under **Application restrictions → Website restrictions**, click **Add** and enter `https://studentpoll-a9e39.firebaseapp.com/*`. Keep the entry for `https://nagasakimark.github.io/*`. (To sign in while testing on your PC, also add `http://localhost/*`.)
4. If **API restrictions** is set to "Restrict key", make sure the list includes **Identity Toolkit API**, **Token Service API** and **Cloud Firestore API**.
5. Click **Save**. It can take up to 5 minutes to apply.

### Google's sign-in window (for school networks)

**Sign in with Google** opens Google's own window on `accounts.google.com`, which school web filters allow, rather than Firebase's window on `studentpoll-a9e39.firebaseapp.com`, which some block. Google only opens it for websites listed on the project's sign-in client:

1. Open https://console.cloud.google.com/apis/credentials?project=studentpoll-a9e39.
2. Under **OAuth 2.0 Client IDs**, click **Web client (auto created by Google Service)**. Its client ID starts `457862393597-u8ha6…`.
3. Under **Authorized JavaScript origins**, click **Add URI** and enter `https://nagasakimark.github.io` (no slash at the end). To test on your PC, also add `http://localhost:5173`.
4. Leave **Authorized redirect URIs** as they are, and click **Save**. It can take a few minutes to apply.

Until this is done, Google's window shows "Error 400: origin_mismatch". Close it and use **Try Firebase's sign-in window** (the old way), which works wherever firebaseapp.com isn't blocked. Either way you end up in the same account with the same data.

### Create the Firestore database

1. **Build → Firestore Database → Create database**.
2. Keep the database ID `(default)`. For the location pick **asia-northeast1 (Tokyo)**; it can't be changed later.
3. Choose **Start in production mode** and click **Create**.
4. Open the **Rules** tab, replace everything with [`firestore.rules`](firestore.rules), and click **Publish**.

### Try it

1. Open https://nagasakimark.github.io/dashboard/next/#/settings and click **Sign in with Google and turn on sync**.
2. Try your **Nagasaki City school account** first. If Google shows "Access blocked", "This app is blocked" or "Your administrator…", the school's admin doesn't allow third-party sign-in: sign out and use a personal Gmail account instead (it works the same way).
3. Do the same on your phone. Your data should appear there within a few seconds, and the sidebar (or **More** on the phone) shows **Synced**.
4. Tell Claude which account worked, so the plan can be updated.

### What syncs

Everything: schools, schedule, lesson plans (files over about 900 KB stay on the device that has them), textbooks, curricula, to-dos, board workspaces, templates, class lists, bookmarks, word sets and settings, except settings that describe one device (the last screen, the open workspace). The newest edit of each record wins, and deletions sync too. **Settings → Sync between devices** has "Sync now", "Turn off and sign out" (your data stays on the device) and "Sign out and remove cloud data".

### Free-tier use

One teacher's data is a few thousand small documents. The first sync on a new device reads each once; after that only changes move. That's far inside the free tier (50,000 reads and 20,000 writes a day).
