import type { FC } from 'react'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { NodePanelProps } from '@/app/components/workflow/types'
import { useWorkflowStore } from '@/app/components/workflow/store'
import Field from '@/app/components/workflow/nodes/_base/components/field'
import OutputVars from '@/app/components/workflow/nodes/_base/components/output-vars'
import Split from '../_base/components/split'
import { useNodesMetaData } from '../../hooks/use-nodes-meta-data'

const DynamicNodePanel: FC<NodePanelProps<any>> = ({
  id,
  data,
}) => {
  const { t } = useTranslation()
  const workflowStore = useWorkflowStore()
  const { nodesMap } = useNodesMetaData()
  const nodeMetaData = nodesMap[data.type]
  
  // Get schema from metadata (synced from backend)
  const schema = useMemo(() => {
    return (nodeMetaData?.metaData as any)?.parameters_schema || { properties: {} }
  }, [nodeMetaData])

  const handleParamsChange = (params: Record<string, any>) => {
    const { getNodes, setNodes } = workflowStore.getState()
    const newNodes = getNodes().map((node) => {
      if (node.id === id) {
        return {
          ...node,
          data: {
            ...node.data,
            ...params,
          },
        }
      }
      return node
    })
    setNodes(newNodes)
  }

  const renderField = (key: string, prop: any) => {
    const value = data[key] ?? prop.default
    const title = prop.title || key
    const description = prop.description

    const handleChange = (e: any) => {
        let val = e.target.value
        if (prop.type === 'integer' || prop.type === 'number') {
            val = val === '' ? undefined : Number(val)
        }
        handleParamsChange({ [key]: val })
    }

    const handleCheckboxChange = (e: any) => {
        handleParamsChange({ [key]: e.target.checked })
    }

    return (
      <div key={key} className='mb-4'>
        <div className='system-sm-medium mb-1 text-text-secondary flex items-center justify-between'>
            <span>{title}</span>
            {prop.type && <span className='text-[10px] text-text-tertiary uppercase font-mono bg-background-section-burn px-1 rounded'>{prop.type}</span>}
        </div>
        {description && <div className='body-xs-regular mb-1.5 text-text-tertiary'>{description}</div>}
        
        {prop.type === 'boolean' ? (
            <div className="flex items-center">
                <input 
                    type="checkbox" 
                    checked={!!value} 
                    onChange={handleCheckboxChange}
                    className="w-4 h-4 rounded border-gray-300 text-eq-primary-600 focus:ring-eq-primary-500"
                />
            </div>
        ) : (
            <input 
                type={prop.type === 'integer' || prop.type === 'number' ? 'number' : 'text'}
                value={value ?? ''}
                onChange={handleChange}
                placeholder={`Enter ${title.toLowerCase()}...`}
                className='w-full px-3 py-1.5 text-sm bg-background-section-burn border border-transparent rounded-lg focus:border-eq-primary-500 focus:bg-components-panel-bg outline-none transition-all text-text-primary'
            />
        )}
      </div>
    )
  }

  return (
    <div className='pt-2'>
      <div className='px-4 pb-4'>
        <div className='system-md-medium mb-4 text-text-primary uppercase tracking-tight opacity-60'>Configuration</div>
        {Object.entries(schema.properties || {}).map(([key, prop]) => renderField(key, prop))}
      </div>
      
      <Split />
      
      <div className='mt-2'>
        <OutputVars>
          <div className='body-xs-regular text-text-tertiary'>
            This node follows the V2.0 Protocol. Parameters are dynamically generated from the backend Pydantic model.
          </div>
        </OutputVars>
      </div>
    </div>
  )
}

export default React.memo(DynamicNodePanel)
