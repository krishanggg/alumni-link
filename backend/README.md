## AlumniLink backend

This directory contains the Laravel 13 API. The generated client profile runs
it through WAMP Apache with PHP 8.4 or newer and uses WAMP MySQL for the
database.

The root `setup.bat` validates the environment and configured MySQL credentials,
creates the configured database when it is missing, installs the shipped
frontend source with npm, builds the production SPA, installs production
Composer dependencies, generates an application key, runs migrations and the
initial Super Admin seeder, and creates the public storage link. Node.js/npm
are required for setup and updates, but not for normal runtime after the SPA is
built. On repeat setup, an outdated storage directory link is replaced; an
ordinary file or directory at `backend/public/storage` is never overwritten.
The compiled administrator SPA is generated under `backend/public/app`,
and the client web portal is reserved for School Admin and Super Admin accounts.
The root `start.bat` starts the database queue worker and Laravel scheduler.
Apache and MySQL remain WAMP services.

Feedback WebSockets are optional. The default client environment uses the
existing HTTP polling recovery path. Reverb can be enabled explicitly using
the instructions in `docs/WAMP_LOCAL_INSTALLATION.md`.

Never commit `.env`, passwords, `APP_KEY`, Reverb credentials, Resend keys, or
other credentials. The client template is `.env.wamp.example`.
