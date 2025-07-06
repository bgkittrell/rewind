// Resume functionality constants for backend
export const RESUME_CONSTANTS = {
  // Minimum progress threshold for resume eligibility (30 seconds)
  RESUME_THRESHOLD: 30,

  // Completion threshold percentage (95%)
  COMPLETION_THRESHOLD: 0.95,
} as const

// Export individual constants for convenience
export const {
  RESUME_THRESHOLD,
  COMPLETION_THRESHOLD,
} = RESUME_CONSTANTS
