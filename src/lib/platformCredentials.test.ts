import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  generateSecurePassword,
  passwordIssues,
  passwordRequirementMessage,
} from './platformCredentials.ts'

const copy = {
  length: 'length',
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  number: 'number',
  special: 'special',
}

describe('organization owner password', () => {
  it('names each missing rule, including a capital letter', () => {
    assert.deepEqual(passwordIssues('password'), ['uppercase', 'number', 'special'])
    assert.equal(
      passwordRequirementMessage('password', copy),
      'uppercase number special',
    )
  })

  it('accepts a password with upper, lower, number, and special', () => {
    assert.deepEqual(passwordIssues('Password1!'), [])
    assert.equal(passwordRequirementMessage('Password1!', copy), null)
  })

  it('stays quiet until the admin types a password', () => {
    assert.equal(passwordRequirementMessage('', copy), null)
  })

  it('generated passwords satisfy the same rules', () => {
    for (let i = 0; i < 20; i += 1) {
      assert.deepEqual(passwordIssues(generateSecurePassword()), [])
    }
  })
})
