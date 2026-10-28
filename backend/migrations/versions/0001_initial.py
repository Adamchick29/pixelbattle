"""Initial persistent board, accounts and page load accounting."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("next_pixel_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    board = op.create_table("boards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pixels", sa.LargeBinary(), nullable=False),
        sa.Column("revision", sa.BigInteger(), nullable=False),
    )
    op.bulk_insert(board, [{"id": 1, "pixels": bytes(256 * 256), "revision": 0}])
    op.create_table("hourly_views",
        sa.Column("hour", sa.DateTime(timezone=True), primary_key=True),
        sa.Column("count", sa.BigInteger(), nullable=False),
    )
    op.create_table("page_views",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_page_views_created_at", "page_views", ["created_at"])


def downgrade():
    op.drop_table("page_views")
    op.drop_table("hourly_views")
    op.drop_table("boards")
    op.drop_table("users")
