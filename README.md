# AlumniLink client delivery

This is the native Windows client distribution of AlumniLink. It uses WAMP
Server (Apache, PHP, and MySQL) and does not require Docker.

Start with **[WAMP local installation](docs/WAMP_LOCAL_INSTALLATION.md)**. It
covers prerequisites, the Apache virtual host, MySQL database, environment
setup, first installation, services, updates, backups, and troubleshooting.

The bundled `setup.bat`, `start.bat`, `stop.bat`, and `doctor.bat` helpers are
intended for a client administrator. The delivery includes the buildable
administrator frontend source and `setup.bat` runs `npm ci` plus a production
build into `backend/public/app`. The web portal is administrator-only in this
client profile; alumni use the companion Android app for alumni-facing
features. Node.js/npm are setup and update prerequisites only; Apache serves
the compiled admin SPA alongside Laravel's API at runtime.

Compiled files in `backend/public/app` are generated output and are ignored by
Git. The WAMP setup and production start scripts build them from `web/`.
For Railway, configure the repository-root build command to run
`npm --prefix web ci --no-audit --no-fund --no-progress` followed by
`npm --prefix web run build` before deploying the Laravel public directory.

The **[User Guide](docs/user-guide/00-overview.md)** explains the application
for alumni and administrators.

For browser-based mobile development, run `start-mobile-web.bat`. It starts
the Laravel mobile API and Expo web preview together. Use `stop-mobile-dev.bat`
to stop both services.

## Changing AlumniLink

If you want to change colors, text, buttons, modal sizes, or find where a
feature is located, read:

[docs/CUSTOMIZATION_GUIDE.md](docs/CUSTOMIZATION_GUIDE.md)
# alumni-link
