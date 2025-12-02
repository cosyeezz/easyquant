"""add fields to stock_daily

Revision ID: 001
Revises:
Create Date: 2025-12-02 16:00:00.000000

添加以下字段到stock_daily表：
- name: 股票名称
- pre_close: 前收盘价
- circulation_market_value: 流通市值
- total_market_value: 总市值
- pct_change: 涨跌幅
- turnover_rate: 换手率
- avg_price: 均价
- trading_days: 上市至今交易天数
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    升级数据库：添加新字段到stock_daily表
    """
    # 添加股票名称
    op.add_column('stock_daily', sa.Column('name', sa.String(length=50), nullable=True, comment='股票名称'))

    # 添加前收盘价
    op.add_column('stock_daily', sa.Column('pre_close', sa.Numeric(precision=10, scale=2), nullable=True, comment='前收盘价'))

    # 添加市值字段
    op.add_column('stock_daily', sa.Column('circulation_market_value', sa.Numeric(precision=20, scale=2), nullable=True, comment='流通市值'))
    op.add_column('stock_daily', sa.Column('total_market_value', sa.Numeric(precision=20, scale=2), nullable=True, comment='总市值'))

    # 添加衍生指标
    op.add_column('stock_daily', sa.Column('pct_change', sa.Numeric(precision=10, scale=6), nullable=True, comment='涨跌幅'))
    op.add_column('stock_daily', sa.Column('turnover_rate', sa.Numeric(precision=10, scale=6), nullable=True, comment='换手率'))
    op.add_column('stock_daily', sa.Column('avg_price', sa.Numeric(precision=10, scale=2), nullable=True, comment='均价'))
    op.add_column('stock_daily', sa.Column('trading_days', sa.Integer(), nullable=True, comment='上市至今交易天数'))


def downgrade() -> None:
    """
    降级数据库：删除新添加的字段
    """
    op.drop_column('stock_daily', 'trading_days')
    op.drop_column('stock_daily', 'avg_price')
    op.drop_column('stock_daily', 'turnover_rate')
    op.drop_column('stock_daily', 'pct_change')
    op.drop_column('stock_daily', 'total_market_value')
    op.drop_column('stock_daily', 'circulation_market_value')
    op.drop_column('stock_daily', 'pre_close')
    op.drop_column('stock_daily', 'name')
