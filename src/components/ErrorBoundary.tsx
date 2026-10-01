import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logError } from '@/lib/errorLog'

interface Props {
  /** Where the error happened, for the log ("page", "widget Timer"…). */
  where: string
  fallback: (error: Error, reset: () => void) => ReactNode
  children: ReactNode
}

/** Keeps a failure in one part of the screen from taking down the rest. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError(error, this.props.where)
    if (info.componentStack) console.error(info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    return this.state.error ? this.props.fallback(this.state.error, this.reset) : this.props.children
  }
}
