@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 goto :badfolder
for %%F in (bridge.py manager.html requirements.txt) do if not exist "%~dp0%%F" goto :missingfiles
chcp 65001 >nul
set "PYTHONUTF8=1"
set "PY_CMD="
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -c "import sys; assert sys.version_info >= (3,10)" >nul 2>nul
  if not errorlevel 1 set "PY_CMD=py -3"
)
if not defined PY_CMD (
  where python >nul 2>nul
  if not errorlevel 1 (
    python -c "import sys; assert sys.version_info >= (3,10)" >nul 2>nul
    if not errorlevel 1 set "PY_CMD=python"
  )
)
if not defined PY_CMD (
  echo [ERROR] Install Python 3.10 or newer from https://www.python.org/downloads/windows/
  echo Enable "Add python.exe to PATH" during installation, then reopen this file.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo Creating local Python environment...
  %PY_CMD% -m venv .venv
  if errorlevel 1 goto :failed
)
".venv\Scripts\python.exe" -c "import cryptography, jwt; assert tuple(int(x) for x in jwt.__version__.split('.')[:2]) >= (2,10); from importlib.metadata import version; v=tuple(int(x) for x in version('cryptography').split('.')[:1]); assert (43,) <= v < (47,)" >nul 2>nul
if errorlevel 1 (
  echo Installing OAuth verification dependencies from Python package index...
  ".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r "%~dp0requirements.txt"
  if errorlevel 1 goto :failed
)
echo Starting local helper. Keep this window open.
".venv\Scripts\python.exe" "%~dp0bridge.py" --port 1455 %*
if errorlevel 1 goto :failed
exit /b 0
:failed
echo.
echo [ERROR] Startup failed. Read the message above. Do not share login URLs or credentials.bin.
pause
exit /b 1

:missingfiles
echo [ERROR] Package files are missing. Extract the ENTIRE ZIP first.
echo Keep bridge.py, manager.html, requirements.txt and this launcher together.
echo Launcher folder: %~dp0
pause
exit /b 1
:badfolder
echo [ERROR] Cannot enter the launcher folder. Extract the ZIP to a local folder first.
pause
exit /b 1
