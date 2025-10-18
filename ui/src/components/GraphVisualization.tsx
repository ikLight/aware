import { useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import api from '@/services/api'

interface GraphVisualizationProps {
  onClose: () => void
}

export function GraphVisualization({ onClose }: GraphVisualizationProps) {
  const loadVisualization = useCallback(async () => {
    try {
      const response = await api.get('/visualize-graph', {
        responseType: 'text'
      })
      
      // Create a new div for the visualization
      const container = document.getElementById('graph-container')
      if (container) {
        container.innerHTML = response.data
      }
    } catch (error) {
      console.error('Failed to load visualization:', error)
    }
  }, [])

  useEffect(() => {
    loadVisualization()
  }, [loadVisualization])

  return (
    <Card className="fixed inset-4 z-50 flex flex-col bg-white p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Knowledge Graph Visualization</h2>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
      
      <div className="mt-4 flex-1 overflow-auto">
        <div id="graph-container" className="h-full w-full" />
      </div>
      
      <Alert className="mt-4">
        <AlertTitle>Tip</AlertTitle>
        <AlertDescription>
          You can drag nodes to rearrange them. Use the mouse wheel to zoom in/out. Click the Physics button to adjust the graph layout settings.
        </AlertDescription>
      </Alert>
    </Card>
  )
}