DROP INDEX users_organization_email_unique;

CREATE UNIQUE INDEX users_email_unique
  ON users (lower(email));

ALTER TABLE task_events
  DROP CONSTRAINT task_events_task_id_fkey;
