import { describe, expect, it } from 'vitest'
import { IpaFormat } from './IpaFormat'

describe('IpaFormat', () => {
  it('wraps bare ipa in slashes', () => {
    expect(IpaFormat.display('dɪˈsaɪd')).toBe('/dɪˈsaɪd/')
  })
  it('does not double existing slashes', () => {
    expect(IpaFormat.display('/dɪˈsaɪd/')).toBe('/dɪˈsaɪd/')
  })
  it('returns empty for blank input', () => {
    expect(IpaFormat.display('')).toBe('')
    expect(IpaFormat.display(undefined)).toBe('')
    expect(IpaFormat.display('//')).toBe('')
  })
})
