# Dinar Personal OS

Personal productivity, finance, daily-target, and time-tracking PWA.

## Arsitektur

Browser/PWA -> Astro SSR on Vercel -> Astro `/api/backend` -> Google Apps Script Web App -> Google Sheets

Secret Apps Script hanya ada di server Vercel dan Script Properties, bukan di browser.

## 1. Persiapan

Install Node.js versi yang memenuhi requirement Astro terbaru, Git, dan VS Code.

```bash
npm install
cp .env.example .env
npm run dev
```

## 2. Buat database Google Sheets

Buat spreadsheet kosong, ambil ID dari URL:

`https://docs.google.com/spreadsheets/d/SHEET_ID/edit`

Masuk Extensions > Apps Script dan paste `apps-script/Code.gs`.

Buka Project Settings > Script Properties:

- `SHEET_ID` = ID spreadsheet
- `API_TOKEN` = string random panjang, contoh minimal 40+ karakter

Di Apps Script editor jalankan fungsi `setup()` satu kali dan berikan izin.

## 3. Deploy Apps Script

Deploy > New deployment > Web app.

- Execute as: Me
- Who has access: Anyone (akses data tetap dilindungi API_TOKEN)
- Copy URL `/exec`

Masukkan URL itu ke `.env` sebagai `APPS_SCRIPT_URL`.
Masukkan token yang sama ke `APPS_SCRIPT_TOKEN`.

## 4. Password aplikasi

Isi:

```env
APP_PASSWORD=password-yang-kamu-pakai-login
APP_SESSION_TOKEN=random-string-yang-sangat-panjang
```

Jangan commit `.env`.

## 5. Jalankan lokal

```bash
npm run dev
```

Buka URL yang muncul di terminal, login, dan coba tambah task/transaksi.

## 6. Deploy Vercel

Push ke GitHub, import project ke Vercel, lalu tambahkan empat Environment Variables:
`APPS_SCRIPT_URL`, `APPS_SCRIPT_TOKEN`, `APP_PASSWORD`, `APP_SESSION_TOKEN`.

Deploy.

## 7. Install di HP

Buka URL Vercel di Chrome Android > menu > Add to Home screen / Install app.
Di iPhone buka Safari > Share > Add to Home Screen.

## Data sheets

- Tasks
- Transactions
- DailyTargets
- TimeLogs

Semua sheet dibuat otomatis oleh fungsi `setup()`.

## Pengembangan berikutnya

Fitur yang cocok ditambah setelah MVP stabil:
calendar view, recurring task, monthly budget, category budget, savings goal, timer start/stop, Pomodoro, weekly review, streak, notification, recurring daily template, backup XLSX/CSV, dark/light theme, biometrics via native wrapper, and calendar sync.
