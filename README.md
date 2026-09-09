# Orbit

Orbit is a focused team task manager for managers and employees. Managers can assign and manage work across teams; employees see only their assigned work and can move it through the workflow.

## Run locally

Serve the directory over HTTP so the browser can load the JavaScript modules:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`. Choose any demo account and use `demo123` as the password.

## Product architecture

```text
index.html                         Application shell and accessible controls
styles.css                        Product design system and responsive layouts
app.js                            Composition root; wires adapters to the UI
src/
  data/seed.js                    Demo organization, teams, users, and tasks
  domain/policies.js              Role permissions and task validation
  infrastructure/
    demo-auth-service.js          Replaceable demo identity adapter
    local-workspace-repository.js Replaceable local data adapter
  ui/app-controller.js            UI state, rendering, and user workflows
tests/policies.test.mjs           Permission and validation tests
```

The UI depends on small authentication and repository contracts rather than accessing browser storage itself. That boundary keeps the current prototype dependency-free while allowing production infrastructure to replace the demo adapters.

## Permission model

- A manager can see all tasks in their organization and create, edit, assign, delete, or update them.
- An employee can see only tasks assigned to them and update only those tasks' statuses.
- Every user and task belongs to an organization. This prevents records from different customer workspaces from being mixed when server-side authorization is added.

## Production path

The current login and storage are intentionally a local demo. They are not secure multi-user authentication.

For production, keep the domain and UI layers and replace the two infrastructure adapters with authenticated API implementations. The server should enforce the same policies on every mutation and use durable relational storage with these core entities:

- `organizations(id, name)`
- `teams(id, organization_id, name)`
- `users(id, organization_id, team_id, role, name, email)`
- `tasks(id, organization_id, team_id, assignee_id, created_by_id, title, description, due_date, priority, status, created_at, updated_at)`

Recommended indexes are tasks by `(organization_id, status)`, `(assignee_id, status)`, and `(team_id, due_date)`. Add audit events for task assignment and status changes before introducing notifications or reporting.

Authentication should use a managed identity provider or server-issued secure sessions. Passwords must never be stored or checked in browser JavaScript. Authorization belongs on the server; hiding controls in the interface is only a usability measure.
