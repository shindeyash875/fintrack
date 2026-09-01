"""add_authentication_and_user_isolation

Revision ID: 7a8e9f1b2c3d
Revises: 449007dda940
Create Date: 2026-08-31 19:45:00.000000

"""
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = '7a8e9f1b2c3d'
down_revision: Union[str, None] = '449007dda940'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create users table
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=True),
        sa.Column('full_name', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('google_id', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True)

    # 2. Create refresh_tokens table
    op.create_table(
        'refresh_tokens',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_refresh_tokens_token_hash', 'refresh_tokens', ['token_hash'], unique=True)
    op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'], unique=False)

    # 3. Create password_reset_tokens table
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_password_reset_tokens_token_hash', 'password_reset_tokens', ['token_hash'], unique=True)
    op.create_index('ix_password_reset_tokens_user_id', 'password_reset_tokens', ['user_id'], unique=False)

    # 4. Insert default system user for existing records migration (if any exist)
    default_user_id = '00000000-0000-0000-0000-000000000001'
    op.execute(
        f"""
        INSERT INTO users (id, email, full_name, is_active, is_verified, created_at, updated_at)
        VALUES ('{default_user_id}', 'default@fintrack.app', 'Default User', true, true, now(), now())
        ON CONFLICT (id) DO NOTHING;
        """
    )

    # 5. Add user_id to categories
    op.drop_index('ix_categories_name', table_name='categories')
    op.add_column('categories', sa.Column('user_id', UUID(as_uuid=True), nullable=True))
    op.execute(f"UPDATE categories SET user_id = '{default_user_id}' WHERE user_id IS NULL")
    op.alter_column('categories', 'user_id', nullable=False)
    op.create_foreign_key('fk_categories_user_id', 'categories', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_categories_user_id', 'categories', ['user_id'], unique=False)
    op.create_index('ix_categories_name', 'categories', ['name'], unique=False)
    op.create_unique_constraint('uq_categories_user_name', 'categories', ['user_id', 'name'])

    # 6. Add user_id to expenses
    op.add_column('expenses', sa.Column('user_id', UUID(as_uuid=True), nullable=True))
    op.execute(f"UPDATE expenses SET user_id = '{default_user_id}' WHERE user_id IS NULL")
    op.alter_column('expenses', 'user_id', nullable=False)
    op.create_foreign_key('fk_expenses_user_id', 'expenses', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_expenses_user_id', 'expenses', ['user_id'], unique=False)
    op.create_index('ix_expenses_user_date', 'expenses', ['user_id', 'expense_date'], unique=False)

    # 7. Add user_id to budgets and update unique constraints
    op.drop_constraint('uq_budget_category_period', 'budgets', type_='unique')
    op.add_column('budgets', sa.Column('user_id', UUID(as_uuid=True), nullable=True))
    op.execute(f"UPDATE budgets SET user_id = '{default_user_id}' WHERE user_id IS NULL")
    op.alter_column('budgets', 'user_id', nullable=False)
    op.create_foreign_key('fk_budgets_user_id', 'budgets', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_budgets_user_id', 'budgets', ['user_id'], unique=False)
    op.create_index('ix_budgets_user_period', 'budgets', ['user_id', 'period_month'], unique=False)
    op.create_unique_constraint('uq_user_budget_category_period', 'budgets', ['user_id', 'category_id', 'period_month'])


def downgrade() -> None:
    op.drop_constraint('uq_user_budget_category_period', 'budgets', type_='unique')
    op.drop_index('ix_budgets_user_period', table_name='budgets')
    op.drop_index('ix_budgets_user_id', table_name='budgets')
    op.drop_constraint('fk_budgets_user_id', 'budgets', type_='foreignkey')
    op.drop_column('budgets', 'user_id')
    op.create_unique_constraint('uq_budget_category_period', 'budgets', ['category_id', 'period_month'])

    op.drop_index('ix_expenses_user_date', table_name='expenses')
    op.drop_index('ix_expenses_user_id', table_name='expenses')
    op.drop_constraint('fk_expenses_user_id', 'expenses', type_='foreignkey')
    op.drop_column('expenses', 'user_id')

    op.drop_constraint('uq_categories_user_name', 'categories', type_='unique')
    op.drop_index('ix_categories_name', table_name='categories')
    op.drop_index('ix_categories_user_id', table_name='categories')
    op.drop_constraint('fk_categories_user_id', 'categories', type_='foreignkey')
    op.drop_column('categories', 'user_id')
    op.create_index('ix_categories_name', 'categories', ['name'], unique=True)

    op.drop_table('password_reset_tokens')
    op.drop_table('refresh_tokens')
    op.drop_table('users')
