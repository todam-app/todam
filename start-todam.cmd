@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ========================================
echo Todam - demarrage local
echo ========================================
echo.

call :require_node
if errorlevel 1 goto :failed

call :require_pnpm
if errorlevel 1 goto :failed

call :guard
if errorlevel 1 goto :failed

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Docker Desktop est requis mais la commande docker est introuvable.
  echo Installe Docker Desktop, puis ouvre un nouveau CMD.
  goto :failed
)

docker info >nul 2>&1
if errorlevel 1 (
  if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    echo Demarrage de Docker Desktop...
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
    call :wait_for_docker
    if errorlevel 1 (
      echo [ERREUR] Docker Desktop ne repond pas apres deux minutes.
      goto :failed
    )
  ) else (
    echo [ERREUR] Docker est installe mais son moteur ne repond pas.
    echo Demarre Docker Desktop puis relance ce script.
    goto :failed
  )
)

call :assert_port_free 3000
if errorlevel 1 goto :failed

call :assert_port_free 8081
if errorlevel 1 goto :failed

if not exist ".env" (
  call :create_env
  if errorlevel 1 goto :failed
)

echo.
echo Verification des dependances...
call pnpm install --frozen-lockfile
if errorlevel 1 goto :failed

echo.
echo Demarrage de PostgreSQL et PostGIS...
call pnpm dev:db
if errorlevel 1 goto :failed

set /a POSTGRES_ATTEMPT=0
:wait_for_postgres_loop
set "POSTGRES_HEALTH="
for /f "delims=" %%H in ('docker inspect --format "{{.State.Health.Status}}" todam-postgres 2^>nul') do set "POSTGRES_HEALTH=%%H"
if "!POSTGRES_HEALTH!"=="healthy" goto :postgres_ready
set /a POSTGRES_ATTEMPT+=1
if !POSTGRES_ATTEMPT! geq 30 (
  echo [ERREUR] PostgreSQL n'est pas devenu operationnel.
  goto :failed
)
timeout /t 2 /nobreak >nul
goto :wait_for_postgres_loop

:postgres_ready
echo PostgreSQL est pret.

echo.
echo Application des migrations...
call pnpm db:migrate
if errorlevel 1 goto :failed

if exist "data\private\theatre-des-muses.2025-2026.json" (
  set "TODAM_CATALOG=data/private/theatre-des-muses.2025-2026.json"
) else (
  set "TODAM_CATALOG=data/fixtures/theatre-des-muses.sample.json"
)

echo.
echo Import idempotent du catalogue !TODAM_CATALOG!...
call pnpm catalog:import --file "!TODAM_CATALOG!" --apply
if errorlevel 1 goto :failed

echo.
echo Todam va ouvrir http://localhost:8081
echo Utilise Ctrl+C dans cette fenetre pour arreter l'API et Expo.
echo La base Docker restera active.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 8; Start-Process 'http://localhost:8081'"
call pnpm dev
exit /b %ERRORLEVEL%

:require_node
where node >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Node.js est introuvable. Installe Node 24.
  exit /b 1
)

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%V"
if "!NODE_MAJOR!"=="24" exit /b 0

where nvm >nul 2>&1
if not errorlevel 1 (
  echo Activation de Node 24 avec nvm...
  call nvm use 24 >nul 2>&1
  for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%V"
  if "!NODE_MAJOR!"=="24" exit /b 0
)

echo [ERREUR] Todam exige Node 24. Version detectee :
node --version
echo Installe ou active Node 24 puis relance ce script.
exit /b 1

:require_pnpm
where pnpm >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] pnpm est introuvable.
  echo Avec Node 24 : npm install --global pnpm@11.9.0
  exit /b 1
)

for /f "tokens=1 delims=." %%V in ('pnpm --version') do set "PNPM_MAJOR=%%V"
if "!PNPM_MAJOR!"=="11" exit /b 0

echo [ERREUR] Todam exige pnpm 11. Version detectee :
pnpm --version
echo Installe-la avec : npm install --global pnpm@11.9.0
exit /b 1

:guard
set "TODAM_RUNNING_PIDS="
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$root = [regex]::Escape((Resolve-Path '.').Path); $ids = @(Get-CimInstance Win32_Process).Where({$_.Name -eq 'node.exe' -and $_.CommandLine -match $root -and ($_.CommandLine -match 'expo' -or $_.CommandLine -match 'tsx')}).ProcessId; $ids -join ','"`) do set "TODAM_RUNNING_PIDS=%%P"
if defined TODAM_RUNNING_PIDS (
  echo [ERREUR] Une instance Todam est deja en cours ^(PID !TODAM_RUNNING_PIDS!^).
  echo Ferme son CMD avec Ctrl+C avant de relancer Todam.
  exit /b 1
)
exit /b 0

:create_env
echo Creation de .env avec un secret local aleatoire...
node -e "const crypto = require('node:crypto'); const fs = require('node:fs'); const template = fs.readFileSync('.env.example', 'utf8'); fs.writeFileSync('.env', template.replace('replace-with-at-least-32-random-characters', crypto.randomBytes(32).toString('base64')));"
if errorlevel 1 (
  echo [ERREUR] Impossible de creer le fichier .env.
  exit /b 1
)
exit /b 0

:assert_port_free
set "PORT_TO_CHECK=%~1"
set "PORT_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT_TO_CHECK% .*LISTENING"') do set "PORT_PID=%%P"
if defined PORT_PID (
  echo [ERREUR] Le port %PORT_TO_CHECK% est deja utilise par le processus !PORT_PID!.
  echo Ferme ce processus ou l'ancienne instance Todam, puis relance le script.
  exit /b 1
)
exit /b 0

:wait_for_docker
set /a DOCKER_ATTEMPT=0
:wait_for_docker_loop
docker info >nul 2>&1
if not errorlevel 1 (
  echo Docker Desktop est pret.
  exit /b 0
)
set /a DOCKER_ATTEMPT+=1
if !DOCKER_ATTEMPT! geq 60 exit /b 1
timeout /t 2 /nobreak >nul
goto :wait_for_docker_loop

:failed
echo.
echo Le demarrage de Todam a echoue. Lis le message ci-dessus.
echo.
pause
exit /b 1
