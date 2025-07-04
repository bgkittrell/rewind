/**
 * Strips HTML tags from a string and returns clean text
 * @param html The HTML string to clean
 * @returns The cleaned text without HTML tags
 */
export function stripHtml(html: string): string {
  if (!html) return ''

  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  // Get text content and clean up extra whitespace
  const textContent = tempDiv.textContent || tempDiv.innerText || ''

  // Remove extra whitespace and normalize
  return textContent.replace(/\s+/g, ' ').trim()
}

/**
 * Truncates text to a specified length and adds ellipsis if needed
 * @param text The text to truncate
 * @param maxLength The maximum length of the text
 * @returns The truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text

  return text.substring(0, maxLength).trim() + '...'
}

/**
 * Strips HTML tags and truncates text in one function
 * @param html The HTML string to clean and truncate
 * @param maxLength The maximum length of the final text
 * @returns The cleaned and truncated text
 */
export function stripAndTruncate(html: string, maxLength: number): string {
  const cleanText = stripHtml(html)
  return truncateText(cleanText, maxLength)
}
