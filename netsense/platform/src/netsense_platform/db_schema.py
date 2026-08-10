from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

metadata = sa.MetaData()

topology_snapshots = sa.Table(
    "topology_snapshots",
    metadata,
    sa.Column("tenant_id", sa.Text(), nullable=False),
    sa.Column("snapshot_id", sa.Text(), nullable=False),
    sa.Column("site_id", sa.Text(), nullable=False),
    sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("payload", JSONB(), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint("tenant_id", "snapshot_id"),
)

incident_cases = sa.Table(
    "incident_cases",
    metadata,
    sa.Column("tenant_id", sa.Text(), nullable=False),
    sa.Column("incident_id", sa.Text(), nullable=False),
    sa.Column("site_id", sa.Text(), nullable=False),
    sa.Column("state", sa.Text(), nullable=False),
    sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("acknowledged_at", sa.DateTime(timezone=True)),
    sa.Column("resolved_at", sa.DateTime(timezone=True)),
    sa.Column("investigation_notes", sa.Text(), nullable=False),
    sa.Column("actual_root_cause_entity_id", sa.Text()),
    sa.Column("payload", JSONB(), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint("tenant_id", "incident_id"),
)

incident_analyses = sa.Table(
    "incident_analyses",
    metadata,
    sa.Column("tenant_id", sa.Text(), nullable=False),
    sa.Column("incident_id", sa.Text(), nullable=False),
    sa.Column("site_id", sa.Text(), nullable=False),
    sa.Column("analysed_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("payload", JSONB(), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint("tenant_id", "incident_id"),
)

incident_actions = sa.Table(
    "incident_actions",
    metadata,
    sa.Column("tenant_id", sa.Text(), nullable=False),
    sa.Column("action_id", sa.BigInteger(), nullable=False),
    sa.Column("incident_id", sa.Text(), nullable=False),
    sa.Column("kind", sa.Text(), nullable=False),
    sa.Column("actor", sa.Text(), nullable=False),
    sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("details", JSONB(), nullable=False),
    sa.PrimaryKeyConstraint("action_id"),
)

idempotency_records = sa.Table(
    "idempotency_records",
    metadata,
    sa.Column("tenant_id", sa.Text(), nullable=False),
    sa.Column("incident_id", sa.Text(), nullable=False),
    sa.Column("idempotency_key", sa.Text(), nullable=False),
    sa.Column("fingerprint", sa.String(length=64), nullable=False),
    sa.Column("response", JSONB(), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint("tenant_id", "incident_id", "idempotency_key"),
)
