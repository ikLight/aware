import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import api from '@/services/api'

interface GraphVisualizationProps {
  onClose: () => void
}

export function GraphVisualization({ onClose }: GraphVisualizationProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVisualization = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading visualization...');

      // Call the visualization API
      const response = await api.post('/visualize-graph', null, {
        responseType: 'text',
        headers: {
          'Accept': 'text/html',
        }
      });
      console.log('Received response:', response);
      
      // Create a new div for the visualization
      const container = document.getElementById('graph-container')
      if (container) {
        // First clear any existing content
        container.innerHTML = '';
        
        // Create a wrapper for the visualization that fills the container
        container.innerHTML = `
          <div style="width: 100%; height: 100%; position: relative;">
            ${response.data}
          </div>
        `;
        
        // Since the visualization HTML includes scripts, we need to execute them
        const scripts = container.getElementsByTagName('script');
        Array.from(scripts).forEach(script => {
          const newScript = document.createElement('script');
          Array.from(script.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.textContent = script.textContent;
          script.parentNode?.replaceChild(newScript, script);
        });
      }
    } catch (error: any) {
      console.error('Failed to load visualization:', error);
      setError(error.response?.data?.detail || 'Failed to load the knowledge graph visualization. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [])

  useEffect(() => {
    console.log('Component mounted, loading visualization...');
    loadVisualization();
  }, [loadVisualization]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <Card className="w-full h-[90vh] max-w-7xl flex flex-col bg-card shadow-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-foreground">Knowledge Graph Visualization</h2>
          <Button variant="ghost" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
            Close
          </Button>
        </div>
        
        <div className="flex-1 overflow-hidden relative p-4">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px] z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading visualization...</p>
              </div>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div id="graph-container" className="w-full h-full bg-card rounded-lg border" />
        </div>
        
        <div className="p-6 border-t">
          <Alert>
            <AlertTitle>Tip</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              You can drag nodes to rearrange them. Use the mouse wheel to zoom in/out. Click the Physics button to adjust the graph layout settings.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    </div>
  )
}