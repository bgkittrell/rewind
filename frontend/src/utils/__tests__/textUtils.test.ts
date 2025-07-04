import { describe, it, expect } from 'vitest'
import { stripAndTruncate } from '../textUtils'

describe('textUtils', () => {
  describe('stripAndTruncate', () => {
    it('should return original text when under limit', () => {
      const text = 'This is a short text'
      const result = stripAndTruncate(text, 100)
      expect(result).toBe(text)
    })

    it('should truncate text when over limit', () => {
      const text = 'This is a very long text that should be truncated because it exceeds the maximum length'
      const result = stripAndTruncate(text, 50)
      expect(result).toBe('This is a very long text that should be truncated...')
      expect(result.length).toBeLessThanOrEqual(53) // 50 + '...'
    })

    it('should handle empty strings', () => {
      const result = stripAndTruncate('', 50)
      expect(result).toBe('')
    })

    it('should handle null/undefined inputs', () => {
      expect(stripAndTruncate(null as any, 50)).toBe('')
      expect(stripAndTruncate(undefined as any, 50)).toBe('')
    })

    it('should strip HTML tags', () => {
      const htmlText = '<p>This is <strong>bold</strong> text with <a href="#">link</a></p>'
      const result = stripAndTruncate(htmlText, 100)
      expect(result).toBe('This is bold text with link')
    })

    it('should handle HTML entities', () => {
      const textWithEntities = 'Text with &quot;quotes&quot; and &amp; symbols'
      const result = stripAndTruncate(textWithEntities, 100)
      expect(result).toBe('Text with "quotes" and & symbols')
    })

    it('should strip HTML and truncate when necessary', () => {
      const longHtmlText = '<div><p>This is a very long HTML text that contains <strong>multiple</strong> tags and should be <em>truncated</em> properly</p></div>'
      const result = stripAndTruncate(longHtmlText, 50)
      expect(result).toContain('This is a very long HTML text that contains...')
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
    })

    it('should handle zero limit', () => {
      const text = 'Some text'
      const result = stripAndTruncate(text, 0)
      expect(result).toBe('...')
    })

    it('should handle negative limit', () => {
      const text = 'Some text'
      const result = stripAndTruncate(text, -10)
      expect(result).toBe('...')
    })

    it('should preserve whitespace properly', () => {
      const text = 'Text with    multiple   spaces'
      const result = stripAndTruncate(text, 100)
      expect(result).toBe('Text with multiple spaces')
    })
  })
})