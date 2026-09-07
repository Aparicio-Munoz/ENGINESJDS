import { Component } from 'react'
import styles from './ErrorBoundary.module.css'

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
      <main className={styles.page}>
        <div className={styles.content}>
          <h1 className={styles.title}>Algo no salió como esperábamos</h1>
          <p className={styles.message}>
            Ocurrió un error inesperado. Recarga la página para continuar.
          </p>
          <button
            className={styles.button}
            type="button"
            onClick={() => window.location.reload()}
          >
            Recargar
          </button>
        </div>
      </main>
    )
  }
}
