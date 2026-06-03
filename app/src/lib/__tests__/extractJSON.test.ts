import { describe, it, expect } from 'vitest'
import { extractJSON } from '../extractJSON'

describe('extractJSON', () => {
  it('extracts a plain object', () => {
    expect(extractJSON('{"calories":350}')).toBe('{"calories":350}')
  })

  it('extracts an object with surrounding prose', () => {
    const r = 'Here is the result: {"calories":350} — hope that helps!'
    expect(extractJSON(r)).toBe('{"calories":350}')
  })

  it('strips a ```json code fence', () => {
    const r = '```json\n{"calories":350}\n```'
    expect(extractJSON(r)).toBe('{"calories":350}')
  })

  it('strips a plain ``` code fence', () => {
    const r = '```\n{"calories":350}\n```'
    expect(extractJSON(r)).toBe('{"calories":350}')
  })

  it('handles nested objects', () => {
    const obj = '{"a":{"b":{"c":1}}}'
    expect(extractJSON(obj)).toBe(obj)
  })

  it('handles arrays', () => {
    const arr = '[{"calories":100},{"calories":200}]'
    expect(extractJSON(arr)).toBe(arr)
  })

  it('handles strings containing braces', () => {
    const obj = '{"text":"eat {protein} bars","calories":200}'
    expect(extractJSON(obj)).toBe(obj)
  })

  it('handles escape sequences inside strings', () => {
    const obj = '{"note":"she said \\"hello\\"","calories":0}'
    expect(extractJSON(obj)).toBe(obj)
  })

  it('handles a backslash before a closing brace inside a string', () => {
    const obj = '{"path":"C:\\\\Users\\\\foo","calories":0}'
    expect(extractJSON(obj)).toBe(obj)
  })

  it('picks the first JSON structure when multiple exist', () => {
    const r = 'First: {"a":1} then {"b":2}'
    expect(extractJSON(r)).toBe('{"a":1}')
  })

  it('prefers { over [ when { appears first', () => {
    const r = '{"a":[1,2,3]}'
    expect(extractJSON(r)).toBe('{"a":[1,2,3]}')
  })

  it('returns an array when [ appears first', () => {
    const r = '[{"a":1}]'
    expect(extractJSON(r)).toBe('[{"a":1}]')
  })

  it('returns an array when [ appears before {', () => {
    const r = 'result: [1,2,3] and {"extra":true}'
    expect(extractJSON(r)).toBe('[1,2,3]')
  })

  it('handles multi-meal response with prose wrapper', () => {
    const r = 'I parsed your meals:\n```json\n{"multi":true,"items":[{"text":"eggs","calories":150}]}\n```\nEnjoy!'
    expect(JSON.parse(extractJSON(r))).toMatchObject({ multi: true })
  })

  it('throws when no JSON structure present', () => {
    expect(() => extractJSON('no json here')).toThrow('No JSON object or array found')
  })

  it('throws on unterminated structure', () => {
    expect(() => extractJSON('{"calories":350')).toThrow('Unterminated JSON structure')
  })
})
