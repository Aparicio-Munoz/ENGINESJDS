import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050A14',
        color: '#E2E8F0',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem', color: '#F97316', fontWeight: 800 }}>
            Oops
          </p>
          <p style={{ fontSize: '1rem', margin: '0 0 1.5rem', color: '#94A3B8' }}>
            Ocurrió un error inesperado. Intenta recargar la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 28px',
              border: 'none',
              borderRadius: 8,
              background: '#F97316',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }
}
