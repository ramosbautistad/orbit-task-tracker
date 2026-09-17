DROP INDEX IF EXISTS users_organization_email_unique;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON users (lower(email));

ALTER TABLE task_events
  DROP CONSTRAINT IF EXISTS task_events_task_id_fkey;
