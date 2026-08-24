# Preview Run Doc — SiteVerdict Frontend

## Prerequisites

- Node.js 20.x+ (note: Vite 6 requires Node >=20.16.0; Vite 8+ requires >=20.19.0)
- npm

## 1. Reproduce uncommitted artifacts

This is the main checkout, so no files need copying.

### Downgrade Vite for Node 20.16.0 compatibility

The `package.json` declares Vite 8 / rolldown which requires Node >=20.19.0. If the system Node is 20.16.0, downgrade before first run:

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm install vite@6 @vitejs/plugin-react@4 @tailwindcss/vite@4.1.0 tailwindcss@4.1.0 --save-dev --force
```

## 2. Run the dev server

```bash
cd frontend
npm run dev
```

Vite defaults to port **5173**. The config proxies `/api` to `http://127.0.0.1:8000` (the FastAPI backend).

## 3. Detach (Windows)

Use PowerShell to start detached:

```powershell
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory 'C:\Users\sajid.ali\Documents\fortyguard-teamthermora\frontend' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
```

Confirm alive:

```powershell
powershell -NoProfile -Command "Get-Process -Id <pid>"
```

Verify HTTP:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```

Expected: `200`.
