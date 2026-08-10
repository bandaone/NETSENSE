# Platform database migrations

Migrations require `NETSENSE_DATABASE_URL` and never contain credentials.
Use an asyncpg SQLAlchemy URL, for example:

```bash
export NETSENSE_DATABASE_URL='postgresql+asyncpg://migrator:password@localhost/netsense'
alembic upgrade head
alembic downgrade base
```

The migration identity must own the schema. The runtime identity must be a
separate `NOSUPERUSER NOBYPASSRLS` role with only the grants documented in the
platform README. Application roles such as `admin` do not map to PostgreSQL
superuser privileges.
