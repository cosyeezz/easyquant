import { BlockEnum } from '../../types'
import { BlockClassificationEnum } from '../../block-selector/types'
import type { NodeDefault } from '../../types'

const nodeDefault: NodeDefault<any> = {
  metaData: {
    classification: BlockClassificationEnum.Question, // 这里可以暂时放在某个分类下，或者新增 'Quant'
    sort: 100,
    type: BlockEnum.ColumnMapping,
    title: '列名重命名',
    author: 'EasyQuant',
    description: '将数据列重命名为新名称。',
  },
  defaultValue: {
    mapping: {},
  },
  checkValid: (payload: any, t: any) => {
    return { isValid: true }
  },
}

export default nodeDefault
