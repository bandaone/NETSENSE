"""Add ordered tenant-scoped topology ingestion state.

Revision ID: 20260811_0002
Revises: 20260810_0001
Create Date: 2026-08-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260811_0002"
down_revision: str | None = "20260810_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TENANT_TABLES = ("topology_ingestion_state", "topology_ingestion_receipts")


def upgrade() -> None:
    op.create_table(
        "topology_ingestion_state",
        sa.Column("tenant_id", sa.Text(), nullable=False),
        sa.Column("site_id", sa.Text(), nullable=False),
        sa.Column("collector_id", sa.Text(), nullable=False),
        sa.Column("last_sequence", sa.BigInteger(), nullable=False),
        sa.Column("last_snapshot_id", sa.Text(), nullable=False),
        sa.Column("last_observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_fingerprint", sa.String(length=64), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint("last_sequence > 0", name="ck_topology_ingestion_sequence"),
        sa.ForeignKeyConstraint(
            ["tenant_id", "last_snapshot_id"],
            ["topology_snapshots.tenant_id", "topology_snapshots.snapshot_id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("tenant_id", "site_id", "collector_id"),
    )

    op.create_table(
        "topology_ingestion_receipts",
        sa.Column("tenant_id", sa.Text(), nullable=False),
        sa.Column("collector_id", sa.Text(), nullable=False),
        sa.Column("idempotency_key", sa.Text(), nullable=False),
        sa.Column("fingerprint", sa.String(length=64), nullable=False),
        sa.Column("response", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "response->>'tenantId' IS NOT NULL AND response->>'tenantId' = tenant_id",
            name="ck_topology_ingestion_receipt_tenant",
        ),
        sa.CheckConstraint(
            "response->>'collectorId' IS NOT NULL AND response->>'collectorId' = collector_id",
            name="ck_topology_ingestion_receipt_collector",
        ),
        sa.PrimaryKeyConstraint("tenant_id", "collector_id", "idempotency_key"),
    )

    for table_name in TENANT_TABLES:
        op.execute(f'ALTER TABLE "{table_name}" ENABLE ROW LEVEL SECURITY')
        op.execute(f'ALTER TABLE "{table_name}" FORCE ROW LEVEL SECURITY')
        op.execute(
            f'''CREATE POLICY tenant_isolation ON "{table_name}"
                USING (tenant_id = current_setting('netsense.tenant_id', true))
                WITH CHECK (tenant_id = current_setting('netsense.tenant_id', true))'''
        )


def downgrade() -> None:
    op.drop_table("topology_ingestion_receipts")
    op.drop_table("topology_ingestion_state")
