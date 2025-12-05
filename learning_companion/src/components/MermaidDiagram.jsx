import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid with configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

let diagramIdCounter = 0;

const MermaidDiagram = ({ content, className }) => {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const idRef = useRef(`mermaid-diagram-${diagramIdCounter++}`);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!content || !containerRef.current) return;

      try {
        setError(null);
        const { svg: renderedSvg } = await mermaid.render(idRef.current, content);
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err.message || 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [content]);

  if (error) {
    return (
      <div className={className}>
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '0.5rem',
          color: '#c00'
        }}>
          <strong>Diagram Error:</strong> {error}
        </div>
        <pre style={{ 
          marginTop: '0.5rem',
          padding: '1rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '0.5rem',
          fontSize: '0.85rem',
          overflow: 'auto'
        }}>
          <code>{content}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidDiagram;

