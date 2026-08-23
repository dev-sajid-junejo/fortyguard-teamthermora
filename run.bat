@echo off
echo Starting SiteVerdict...
echo.

echo [1/2] Starting backend on http://localhost:8000
start "SiteVerdict Backend" cmd /c "cd /d %~dp0 && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

echo [2/2] Starting frontend on http://localhost:5173
start "SiteVerdict Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

echo.
echo SiteVerdict is running:
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API docs: http://localhost:8000/docs
echo.
pause
