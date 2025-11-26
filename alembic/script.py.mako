"""${message}

修订版本 ID (Revision ID): ${up_revision}
父级版本 (Revises): ${down_revision | comma,n}
创建日期 (Create Date): ${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
# Alembic 使用的修订版本标识符。
revision: str = ${repr(up_revision)}
# 当前修订版本依赖的父级版本。
down_revision: Union[str, Sequence[str], None] = ${repr(down_revision)}
# 分支标签，用于管理多个并行的迁移分支。
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
# 当前修订版本依赖的其他版本或分支。
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    """
    升级模式，定义了将数据库模式从上一个版本升级到当前版本的操作。
    执行 `alembic upgrade <revision>` 时会调用此函数。
    """
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    """

    降级模式，定义了将数据库模式从当前版本回滚到上一个版本的操作。
    执行 `alembic downgrade <revision>` 时会调用此函数。
    """
    ${downgrades if downgrades else "pass"}
