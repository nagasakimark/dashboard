import { describe, expect, it } from 'vitest'
import { isStudentRoute, studentJoinUrl, studentRoomParam } from './routes'

const loc = (pathname: string, hash = '', search = '') => ({ pathname, hash, search })

describe('isStudentRoute', () => {
  it('matches the production QR path', () => {
    expect(isStudentRoute(loc('/dashboard/student'))).toBe(true)
    expect(isStudentRoute(loc('/dashboard/student/'))).toBe(true)
  })
  it('matches the preview path and the hash form', () => {
    expect(isStudentRoute(loc('/dashboard/next/student'))).toBe(true)
    expect(isStudentRoute(loc('/dashboard/next/', '#/student?room=12345'))).toBe(true)
  })
  it('does not match teacher routes', () => {
    expect(isStudentRoute(loc('/dashboard/'))).toBe(false)
    expect(isStudentRoute(loc('/dashboard/', '#/schedule'))).toBe(false)
    expect(isStudentRoute(loc('/dashboard/students-list'))).toBe(false)
  })
})

describe('studentRoomParam', () => {
  it('reads the room from the query string', () => {
    expect(studentRoomParam(loc('/dashboard/student', '', '?room=48213'))).toBe('48213')
  })
  it('reads the room from the hash query', () => {
    expect(studentRoomParam(loc('/dashboard/', '#/student?room=10001'))).toBe('10001')
  })
  it('returns null when absent', () => {
    expect(studentRoomParam(loc('/dashboard/student'))).toBeNull()
  })
})

describe('studentJoinUrl', () => {
  it('keeps the historical path on production', () => {
    expect(studentJoinUrl('12345', 'https://nagasakimark.github.io', '/dashboard/')).toBe(
      'https://nagasakimark.github.io/dashboard/student?room=12345',
    )
  })
  it('uses the hash form on the preview deployment', () => {
    expect(studentJoinUrl('12345', 'https://nagasakimark.github.io', '/dashboard/next/')).toBe(
      'https://nagasakimark.github.io/dashboard/next/#/student?room=12345',
    )
  })
})
