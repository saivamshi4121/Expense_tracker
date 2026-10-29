# Expense Tracker

### A clearer signal from everyday spending.

Expense Tracker brings cash, digital payments, and end-of-day cash checks into one practical money workflow. Record an expense in a few taps or speak it aloud, review payment activity detected on Android, and close the day with a view of what was spent and what should still be in your wallet.

The goal is not another stream of charts. It is a dependable picture of where your money went, with the important numbers close to the moment they matter.

## What makes it different

- **Cash is accounted for, not just recorded.** A cash wallet estimates the balance from its starting amount and recorded cash expenses. Reconciliation compares that expected balance with the cash physically counted.
- **The day has a closeout.** Daily Closing brings cash spending, digital spending, total spending, and the expected cash balance into one review. Differences can be resolved, marked for later, or noted as forgotten.
- **Digital payments become reviewable entries.** On Android, the notification listener can identify likely payment notifications and place candidates in a review queue. The user chooses whether to accept, categorize, or ignore each candidate.
- **Capture adapts to the moment.** Add expenses manually or use Android speech recognition to turn a spoken expense into a draft for confirmation. The existing parser handles the transcript; the user reviews the result before saving.
- **Merchant choices improve future suggestions.** Accepted detected payments can teach the app a merchant-to-category preference for later suggestions.

## Features

### Expense ledger

- Create, edit, and delete expenses.
- Record amount, category, payment method, date, and an optional note.
- Separate physical cash from digital methods such as UPI, card, bank transfer, and online payments.
- Review recent activity and filter by category, payment method, and date range.

### Cash and daily review

- Set and maintain a starting cash balance.
- Compare the expected cash balance with a physical cash count.
- See daily cash, digital, and combined spending.
- Save a daily closing record and its resolution state.
- Review discrepancies and spending summaries through Money Check.

### Payment detection on Android

- Request notification-listener access through Android Settings.
- Parse supported payment notification formats into a pending queue.
- Review the detected amount, merchant, payment method, and suggested category before adding an expense.
- Accept or ignore candidates; accepted entries can inform future merchant category suggestions.

Notification access is optional. Detection depends on the source app's notification content and format, and is not a bank connection or a guarantee that every payment will be detected.

### Voice entry on Android

- Start and cancel speech recognition from the quick cash workflow.
- See partial recognition while speaking and a parsed draft when recognition completes.
- Confirm the draft or edit it manually before saving.
- Use the speech service available on the device; language availability and recognition quality depend on that service, its installed language models, device configuration, and network conditions.

There is no language selector. The app does not promise universal language coverage.

### Accounts

- Email and password sign-up and sign-in using Supabase Auth.
- Persisted authentication sessions using device storage.

## Technology

- React Native and Expo SDK 57
- TypeScript and Expo Router
- SQLite for on-device expense and workflow data
- Kotlin Expo modules for Android notification listening and speech recognition
- Supabase Auth for account sessions

The expense and workflow records are stored in the device's SQLite database. Supabase is used for authentication; this project does not implement cloud synchronization of expense records.

## Requirements

- Node.js and npm compatible with the installed Expo SDK
- Android Studio and an Android SDK for Android development
- A Supabase project for sign-in and sign-up
- An Android development build for native speech recognition and notification detection

Expo Go does not include this project's custom native modules. Build and run the Android app locally to use those capabilities.

## Run locally

Clone the repository and install dependencies:

```bash
git clone https://github.com/saivamshi4121/Expense_tracker.git
cd Expense_tracker
npm install
```

Create a local environment file from the template:

```powershell
Copy-Item .env.example .env
```

Set the following values in `.env` using your Supabase project settings:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Use the Supabase publishable key intended for client applications. Do not put a service-role key or other server secret in the mobile app. The `.env` file is ignored by Git; `.env.example` is safe to commit because it contains placeholders.

Build and launch the Android development app:

```bash
npm run android
```

For subsequent JavaScript development, start Metro with:

```bash
npm start
```

When using an emulator or device, allow microphone access to use voice entry. Enable notification-listener access in Android Settings to use detected payment review.

## Validation

Run the TypeScript check:

```bash
npx tsc --noEmit
```

Run lint:

```bash
npm run lint
```

Compile the Android debug Kotlin sources from the `android` directory:

```powershell
.\gradlew.bat :app:compileDebugKotlin
```

Parser test files are present in the source tree. A package-level test script is not currently configured.

## Project structure

```text
src/
   app/          Expo Router screens
   components/   Reusable interface components
   context/      Authentication context
   db/           SQLite queries and migrations
   hooks/        Screen-facing data and workflow hooks
   lib/          Supabase client and notification parsing
   utils/        Expense, transaction, and reconciliation logic
modules/
   notification-listener/   Android notification access module
   speech-recognizer/       Android speech recognition module
```

## Privacy and platform notes

- Expense, wallet, daily closing, detected transaction, and learned merchant category data are stored locally in SQLite.
- Android notification access exposes notification titles and text to the app for payment detection. Detected candidates are stored locally for review; notification access should only be enabled when this behavior is understood and wanted.
- Voice recognition is delegated to Android's installed speech-recognition service. The app receives recognition text for parsing; service availability, language models, and any network requirements are determined by the device and recognition provider.
- Notification detection and native speech recognition are Android-specific. Other platforms do not provide these custom Android module capabilities.

## License

See [LICENSE](LICENSE).
