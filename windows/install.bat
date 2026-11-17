@echo off
rem Installs Glass Music for this user: copies the app and adds Start Menu + Desktop shortcuts. Run again to update.
set "DEST=%LOCALAPPDATA%\Programs\GlassMusic"
taskkill /im GlassMusic.exe /f >nul 2>&1
robocopy "%~dp0dist" "%DEST%" /mir /njh /njs /ndl /nfl /np >nul
if errorlevel 8 (echo Copy failed. & pause & exit /b 1)
powershell -NoProfile -Command "$s=New-Object -ComObject WScript.Shell; foreach($d in [Environment]::GetFolderPath('Programs'),[Environment]::GetFolderPath('Desktop')){ $l=$s.CreateShortcut((Join-Path $d 'Glass Music.lnk')); $l.TargetPath='%DEST%\GlassMusic.exe'; $l.WorkingDirectory='%DEST%'; $l.Save() }"
echo Glass Music installed. Open it from the Start Menu or your Desktop.
start "" "%DEST%\GlassMusic.exe"
