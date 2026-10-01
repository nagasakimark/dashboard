import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { errorReport, readErrorLog } from '@/lib/errorLog'
import { ErrorBoundary } from './ErrorBoundary'

function Boom(): never {
  throw new Error('widget exploded')
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ErrorBoundary', () => {
  it('shows the fallback for a failing part and logs the error', () => {
    render(
      <div>
        <p>rest of the app</p>
        <ErrorBoundary where="widget Timer" fallback={(e) => <p role="alert">Problem: {e.message}</p>}>
          <Boom />
        </ErrorBoundary>
      </div>,
    )
    expect(screen.getByText('rest of the app')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe('Problem: widget exploded')
    expect(readErrorLog()[0]).toMatchObject({ message: 'widget exploded' })
    expect(readErrorLog()[0].where).toContain('widget Timer')
    expect(errorReport()).toContain('widget exploded')
  })
})
