# Minecraft Dashboard (Paper) – Full Control + AI Copilot

Dieses ZIP enthält ein **sofort startbares** Dashboard-System:

- **Backend**: Node.js (Express) + WebSocket + RCON + Filesystem (server.properties) + Live Logs
- **Frontend**: React (Vite) + Tailwind + Recharts + Neon Gaming UI + Dark/Light Toggle
- **Auth**: Register/Login mit JWT + bcrypt, Rollen (**erster registrierter User wird Admin**)
- **Setup Wizard**: Erkennt fehlendes/disabled RCON und kann es **automatisch fixen** (enable-rcon, Passwort setzen, broadcast-rcon-to-ops=false) + Restart

## 1) Voraussetzungen
- Docker & Docker Compose
- Paper Server JAR (`paper.jar`) in `server/paper.jar` (die Datei im ZIP ist ein Platzhalter)

## 2) Quick Start
1. Lege deine echte Paper JAR hier ab: `server/paper.jar`
2. (Optional) Passe `docker-compose.yml` an:
   - `JWT_SECRET=...` unbedingt ändern
   - `JAVA_XMX`/`JAVA_XMS` nach RAM
3. Start:

```bash
docker compose up --build
```

4. Öffne UI: http://localhost:3000

## 3) Setup Wizard (RCON Auto-Fix)
Beim ersten Start zeigt das Dashboard (als Admin) einen Wizard, wenn:
- `enable-rcon=false` oder
- `rcon.password` leer ist.

Der Wizard setzt automatisch:
- `enable-rcon=true`
- `broadcast-rcon-to-ops=false`
- `rcon.password=<random>` (nur falls leer)

Anschließend wird automatisch ein **Restart** ausgelöst.

## 4) Ports
- Dashboard UI: `3000`
- Backend API/WS: `8080`
- Minecraft Join Port: **25567** (aus deiner server.properties)

## 5) Sicherheit
- RCON ist **nicht verschlüsselt**. Öffne den RCON-Port nicht ins Internet.
- Secrets werden im UI für Non-Admin maskiert.

## 6) Struktur
Siehe Ordnerstruktur im Projekt – entspricht deiner Vorgabe.

Viel Spaß! ✨
