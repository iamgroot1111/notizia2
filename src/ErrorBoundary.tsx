import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: unknown) { console.error('App error:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16 }}>
          <h2>Es ist ein Fehler aufgetreten</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}
