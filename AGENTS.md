When starting the project, follow PRD.md and SRS Once code has been created, always inspect the relevant existing files before modifying them. Do not unnecessarily rewrite or replace working functionality.
Whenever I say “end session,” update PROGRESS.md with completed/pending work and next steps, update relevant docs if needed, safely commit all changes to Git (never secrets/.env), and in every new session read AGENTS.md, PRD.md, PROGRESS.md, and the existing repo before continuing.
Work on one major task/milestone per session; when the task is complete or the context becomes long/confusing, recommend ending the session and follow the end-session handoff procedure.


1.Do not change the tech stack.
2.No inline styling.
3.Prefer ORM over raw SQL.
4.React must never communicate directly with PostgreSQL.
5.Do not hard-code configuration.
6.Never commit .env.
7.Don't rewrite working code unnecessarily.
8.Keep the UI responsive and consistent.
9.Do not implement future-scope features unless requested.
10.Don't install unnecessary dependencies.
11.After making changes, check that frontend → backend → database integration still works.