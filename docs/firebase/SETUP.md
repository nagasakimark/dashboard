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

## Later (Phase 13)

Sync will also need **Google** turned on under **Sign-in method**, and `nagasakimark.github.io` listed under **Authentication → Settings → Authorized domains**. The exact steps come with that phase.
