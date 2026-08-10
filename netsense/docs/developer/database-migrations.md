# Database Migrations

We use Alembic for PostgreSQL/TimescaleDB schema changes.

## Creating a Migration

1. Start the isolated development database documented in `platform/README.md`.
2. Create a new migration:

```bash
cd platform
.venv/bin/alembic revision -m "add_new_feature_table"
```

Edit the generated file in `platform/migrations/versions/xxxx_add_new_feature_table.py`:

```python
def upgrade():
	op.create_table('new_table',
		sa.Column('id', postgresql.UUID(), primary_key=True),
		...
	)

def downgrade():
	op.drop_table('new_table')
```

Apply the migration locally with a schema-owner URL supplied only to the
migration process:

```bash
NETSENSE_DATABASE_URL='postgresql+asyncpg://migrator:secret@database/netsense' \
  .venv/bin/alembic upgrade head
```

Test the downgrade with `.venv/bin/alembic downgrade -1` (for relational
tables only; hypertable downgrades are exempt per NFR-MAIN-002), verify the
owned objects are absent, and reapply `upgrade head` before integration tests.

Include the migration in your PR.

### Rules
Always provide `upgrade()` and, for relational tables, `downgrade()`. For hypertables, `downgrade()` can be a no-op or omitted (document why). Do not modify existing migrations; always create a new one. Test against a copy of production schema before merging.

### Running in Production

Migrations are an explicit deployment step and do not run under the restricted
runtime database identity. Upgrade with the schema-owner identity, verify the
revision, then roll out the application. This prevents a compromised API
process from changing database structure or disabling RLS.
