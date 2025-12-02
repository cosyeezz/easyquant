"""Initial migration

修订版本 ID (Revision ID): ea85ed974b2d
父级版本 (Revises):
创建日期 (Create Date): 2025-12-02 23:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ea85ed974b2d'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('stock_daily',
    sa.Column('open', sa.Numeric(precision=10, scale=2), nullable=True, comment='开盘价'),
    sa.Column('high', sa.Numeric(precision=10, scale=2), nullable=True, comment='最高价'),
    sa.Column('low', sa.Numeric(precision=10, scale=2), nullable=True, comment='最低价'),
    sa.Column('close', sa.Numeric(precision=10, scale=2), nullable=True, comment='收盘价'),
    sa.Column('pre_close', sa.Numeric(precision=10, scale=2), nullable=True, comment='前收盘价'),
    sa.Column('volume', sa.Numeric(precision=20, scale=2), nullable=True, comment='成交量'),
    sa.Column('amount', sa.Numeric(precision=20, scale=2), nullable=True, comment='成交额'),
    sa.Column('name', sa.String(length=50), nullable=True, comment='股票名称'),
    sa.Column('circulation_market_value', sa.Numeric(precision=20, scale=2), nullable=True, comment='流通市值'),
    sa.Column('total_market_value', sa.Numeric(precision=20, scale=2), nullable=True, comment='总市值'),
    sa.Column('pct_change', sa.Numeric(precision=10, scale=6), nullable=True, comment='涨跌幅'),
    sa.Column('turnover_rate', sa.Numeric(precision=10, scale=6), nullable=True, comment='换手率'),
    sa.Column('avg_price', sa.Numeric(precision=10, scale=2), nullable=True, comment='均价'),
    sa.Column('trading_days', sa.Integer(), nullable=True, comment='上市至今交易天数'),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False, comment='记录创建时间'),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False, comment='记录更新时间'),
    sa.Column('code', sa.String(length=15), nullable=False, comment='股票代码'),
    sa.Column('trade_date', sa.Date(), nullable=False, comment='交易日期'),
    sa.PrimaryKeyConstraint('code', 'trade_date'),
    schema='public'
    )
    op.create_table('stock_minute',
    sa.Column('open', sa.Numeric(precision=10, scale=2), nullable=True, comment='开盘价'),
    sa.Column('high', sa.Numeric(precision=10, scale=2), nullable=True, comment='最高价'),
    sa.Column('low', sa.Numeric(precision=10, scale=2), nullable=True, comment='最低价'),
    sa.Column('close', sa.Numeric(precision=10, scale=2), nullable=True, comment='收盘价'),
    sa.Column('volume', sa.Numeric(precision=20, scale=2), nullable=True, comment='成交量'),
    sa.Column('amount', sa.Numeric(precision=20, scale=2), nullable=True, comment='成交额'),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False, comment='记录创建时间'),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False, comment='记录更新时间'),
    sa.Column('code', sa.String(length=15), nullable=False, comment='股票代码'),
    sa.Column('trade_date', sa.Date(), nullable=False, comment='交易日期'),
    sa.Column('time', sa.Time(), nullable=False, comment='交易时间 (时分秒)'),
    sa.PrimaryKeyConstraint('code', 'trade_date', 'time'),
    schema='public'
    )
    op.create_table('etl_metadata',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('source_identifier', sa.String(), nullable=False),
    sa.Column('source_hash', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('processed_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('source_identifier'),
    schema='public'
    )


def downgrade() -> None:
    op.drop_table('etl_metadata', schema='public')
    op.drop_table('stock_minute', schema='public')
    op.drop_table('stock_daily', schema='public')