# 📆 My Schedule

> Plan your day. Stay focused. Achieve more.

A clean, fast React Native scheduling app built with Expo. Build a weekly routine, track daily progress, and enter deep focus — all offline, no account needed.

---

## 📱 Download

| Platform | Link |
|----------|------|
| Android | [Download APK](./app-release.apk) |
| iOS | Coming soon |

> **Android users:** After downloading, go to Settings → Install unknown apps → allow your browser, then open the APK.

---

## ✨ Features

- **Weekly Timetable** — Build a repeating weekly schedule with per-day tasks and optional repeat rules
- **Live Progress Tracking** — Start tasks, watch elapsed time tick live, mark them done
- **Focus Mode** — Full-screen dark countdown timer synced to your task duration with pause/resume
- **Calendar View** — Browse any date and see historical task completion with color-coded status
- **Smart Reminders** — Automatic push notifications at task start time, even when the app is closed
- **Quick Add from Home** — Add a one-off task for today without leaving the Home screen
- **Drag to Reorder** — Long-press the handle on any task to reorder within a day
- **Motivational Feedback** — Dynamic messages that respond to your daily progress

---


## 🛠️ Tech Stack

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/) + [Expo Router](https://expo.github.io/router/)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) — offline data persistence
- [Expo Notifications](https://docs.expo.dev/push-notifications/overview/) — local push reminders
- [react-native-draggable-flatlist](https://github.com/computerjazz/react-native-draggable-flatlist) — drag to reorder
- [lucide-react-native](https://lucide.dev/) — icons

---

## 🚀 Run Locally

### Prerequisites

- Node.js 18+
- Expo CLI
- Android Studio (for emulator) or a physical device with Expo Go

### Steps

```bash
# Clone the repo
git clone (project_link)
cd my-schedule

# Install dependencies
npm install

# Start the dev server
npx expo start
```

Then press `a` to open on Android emulator, or scan the QR code with Expo Go on your phone.

---

## 🏗️ Build

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) for cloud builds.

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build Android APK
eas build -p android --profile preview
```

---

## 📁 Project Structure

```
├── app/                    # Expo Router screens
│   ├── _layout.jsx         # Tab navigation layout
│   ├── index.jsx           # Home screen
│   ├── timetable.jsx       # Weekly timetable
│   ├── calendar.jsx        # Calendar view
│   ├── focus.jsx           # Focus mode timer
│   └── about.jsx           # About screen
├── components/             # Reusable components
│   ├── Header.jsx
│   ├── StatsRow.jsx
│   ├── TaskRow.jsx
│   ├── TaskRowTable.jsx
│   └── AddEditTaskModal.jsx
├── utils/                  # Helpers & hooks
│   ├── notifications.js
│   ├── useDailyNotifs.js
│   └── storage.js
├── assets/images/          # App icons & splash
├── theme.js                # Design tokens (colors, spacing)
└── app.json                # Expo config
```

---

## 🎨 Design System

All colors, spacing, and border-radius values live in `theme.js` at the project root. The app uses a cohesive indigo palette:

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#4f46e5` | Buttons, active states |
| `primaryLight` | `#eef2ff` | Backgrounds, badges |
| `amber` | `#f59e0b` | In-progress tasks |
| `green` | `#10b981` | Completed tasks |
| `text` | `#0f172a` | Primary text |
| `bg` | `#f8fafc` | Screen background |

---

## 📦 Data Storage

All data is stored locally using AsyncStorage — no server, no account, no internet required.

| Key | Contents |
|-----|----------|
| `@TIMETABLE_v1` | Weekly task template (per weekday) |
| `@TASK_PROGRESS_v1` | Daily completion state (per date) |
| `@Focus_Duration` | Active focus session data |

---

## 👩‍💻 Developer

**Harsh Upadhyay** — Creator & Developer

---

## 📄 License

MIT — feel free to use, modify, and distribute.