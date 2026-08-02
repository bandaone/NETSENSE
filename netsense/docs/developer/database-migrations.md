# Database Migrations

We use Alembic for PostgreSQL/TimescaleDB schema changes.

## Creating a Migration

1. Ensure your development database is up to date: `make dev`
2. Create a new migration:

```bash
cd platform
poetry run alembic revision -m "add_new_feature_table"
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

Apply the migration locally: `poetry run alembic upgrade head`

Test the downgrade: `poetry run alembic downgrade -1` (for relational tables only; hypertable downgrades are exempt per NFR-MAIN-002)

Include the migration in your PR.

### Rules
Always provide `upgrade()` and, for relational tables, `downgrade()`. For hypertables, `downgrade()` can be a no-op or omitted (document why). Do not modify existing migrations; always create a new one. Test against a copy of production schema before merging.

### Running in Production
Migrations run automatically during platform startup via `poetry run alembic upgrade head`.

