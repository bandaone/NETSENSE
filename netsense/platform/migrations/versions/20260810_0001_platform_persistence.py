"""Create tenant-scoped topology and incident persistence.

Revision ID: 20260810_0001
Revises:
Create Date: 2026-08-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260810_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TENANT_TABLES = (
    "topology_snapshots",
    "incident_cases",
    "incident_analyses",
    "incident_actions",
    "idempotency_records",
)


def _tenant_columns() -> list[sa.Column]:
    return [sa.Column("tenant_id", sa.Text(), nullable=False)]


def upgrade() -> None:
    op.create_table(
        "topology_snapshots",
        *_tenant_columns(),
        sa.Column("snapshot_id", sa.Text(), nullable=False),
        sa.Column("site_id", sa.Text(), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "payload->>'tenantId' IS NOT NULL AND payload->>'tenantId' = tenant_id",
            name="ck_topology_tenant",
        ),
        sa.CheckConstraint(
            "payload->>'snapshotId' IS NOT NULL AND payload->>'snapshotId' = snapshot_id",
            name="ck_topology_identity",
        ),
        sa.CheckConstraint(
            "payload->'site'->>'id' IS NOT NULL AND payload->'site'->>'id' = site_id",
            name="ck_topology_site",
        ),
        sa.PrimaryKeyConstraint("tenant_id", "snapshot_id"),
    )
    op.create_index(
        "ix_topology_site_observed",
        "topology_snapshots",
        ["tenant_id", "site_id", sa.text("observed_at DESC")],
    )

    op.create_table(
        "incident_cases",
        *_tenant_columns(),
        sa.Column("incident_id", sa.Text(), nullable=False),
        sa.Column("site_id", sa.Text(), nullable=False),
        sa.Column("state", sa.Text(), nullable=False),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True)),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("investigation_notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("actual_root_cause_entity_id", sa.Text()),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "state IN ('open', 'acknowledged', 'resolved')", name="ck_incident_state"
        ),
        sa.CheckConstraint(
            "payload->'incident'->>'tenantId' IS NOT NULL "
            "AND payload->'incident'->>'tenantId' = tenant_id",
            name="ck_incident_tenant",
        ),
        sa.CheckConstraint(
            "payload->'incident'->>'siteId' IS NOT NULL "
            "AND payload->'incident'->>'siteId' = site_id",
            name="ck_incident_site",
        ),
        sa.CheckConstraint(
            "payload->'incident'->>'id' IS NOT NULL AND payload->'incident'->>'id' = incident_id",
            name="ck_incident_identity",
        ),
        sa.CheckConstraint(
            "payload->'incident'->>'state' IS NOT NULL AND payload->'incident'->>'state' = state",
            name="ck_incident_payload_state",
        ),
        sa.PrimaryKeyConstraint("tenant_id", "incident_id"),
    )
    op.create_index(
        "ix_incident_site_detected",
        "incident_cases",
        ["tenant_id", "site_id", sa.text("detected_at DESC"), "incident_id"],
    )
    op.create_index(
        "ix_incident_site_state_detected",
        "incident_cases",
        ["tenant_id", "site_id", "state", sa.text("detected_at DESC")],
    )

    op.create_table(
        "incident_analyses",
        *_tenant_columns(),
        sa.Column("incident_id", sa.Text(), nullable=False),
        sa.Column("site_id", sa.Text(), nullable=False),
        sa.Column("analysed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "payload->>'tenantId' IS NOT NULL AND payload->>'tenantId' = tenant_id",
            name="ck_analysis_tenant",
        ),
        sa.CheckConstraint(
            "payload->>'siteId' IS NOT NULL AND payload->>'siteId' = site_id",
            name="ck_analysis_site",
        ),
        sa.CheckConstraint(
            "payload->>'incidentId' IS NOT NULL AND payload->>'incidentId' = incident_id",
            name="ck_analysis_incident",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "incident_id"],
            ["incident_cases.tenant_id", "incident_cases.incident_id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("tenant_id", "incident_id"),
    )

    op.create_table(
        "incident_actions",
        *_tenant_columns(),
        sa.Column("action_id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("incident_id", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("actor", sa.Text(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.CheckConstraint(
            "kind IN ('acknowledged', 'note_updated', 'resolved')",
            name="ck_incident_action_kind",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "incident_id"],
            ["incident_cases.tenant_id", "incident_cases.incident_id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("action_id"),
    )
    op.create_index(
        "ix_incident_actions_timeline",
        "incident_actions",
        ["tenant_id", "incident_id", "occurred_at", "action_id"],
    )

    op.create_table(
        "idempotency_records",
        *_tenant_columns(),
        sa.Column("incident_id", sa.Text(), nullable=False),
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
            name="ck_idempotency_tenant",
        ),
        sa.CheckConstraint(
            "response->>'id' IS NOT NULL AND response->>'id' = incident_id",
            name="ck_idempotency_incident",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "incident_id"],
            ["incident_cases.tenant_id", "incident_cases.incident_id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("tenant_id", "incident_id", "idempotency_key"),
    )

    for table_name in TENANT_TABLES:
        op.execute(f'ALTER TABLE "{table_name}" ENABLE ROW LEVEL SECURITY')
        op.execute(f'ALTER TABLE "{table_name}" FORCE ROW LEVEL SECURITY')
        op.execute(
            f'''CREATE POLICY tenant_isolation ON "{table_name}"
                USING (tenant_id = current_setting('netsense.tenant_id', true))
                WITH CHECK (tenant_id = current_setting('netsense.tenant_id', true))'''
        )

    op.execute(
        """
        CREATE FUNCTION reject_incident_action_mutation()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            RAISE EXCEPTION 'incident actions are append-only'
                USING ERRCODE = '42501';
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE TRIGGER incident_actions_append_only
        BEFORE UPDATE OR DELETE ON incident_actions
        FOR EACH ROW EXECUTE FUNCTION reject_incident_action_mutation()
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS incident_actions_append_only ON incident_actions")
    op.execute("DROP FUNCTION IF EXISTS reject_incident_action_mutation()")
    op.drop_table("idempotency_records")
    op.drop_index("ix_incident_actions_timeline", table_name="incident_actions")
    op.drop_table("incident_actions")
    op.drop_table("incident_analyses")
    op.drop_index("ix_incident_site_state_detected", table_name="incident_cases")
    op.drop_index("ix_incident_site_detected", table_name="incident_cases")
    op.drop_table("incident_cases")
    op.drop_index("ix_topology_site_observed", table_name="topology_snapshots")
    op.drop_table("topology_snapshots")
