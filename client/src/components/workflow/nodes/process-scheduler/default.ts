import { BlockEnum } from '../../types'
import { BlockClassificationEnum } from '../../block-selector/types'
import type { NodeDefault } from '../../types'

const nodeDefault: NodeDefault<any> = {
  metaData: {
    classification: BlockClassificationEnum.System,
    sort: 1,
    type: BlockEnum.ProcessScheduler,
    title: '进程调度器',
    author: 'EasyQuant',
    description: '多进程编排调度器，支持通过消息队列解耦进程间通信。',
  },
  defaultValue: {
    process_groups: [],
    mq_type: 'redis',
    mq_config: { redis_url: 'redis://localhost:6379' },
  },
  checkValid: () => {
    return { isValid: true }
  },
}

export default nodeDefault
