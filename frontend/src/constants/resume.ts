// Resume functionality constants
export const RESUME_CONSTANTS = {
  // Progress saving interval (30 seconds in milliseconds)
  PROGRESS_SAVE_INTERVAL: 30000,

  // Minimum progress threshold for resume eligibility (30 seconds)
  RESUME_THRESHOLD: 30,

  // Auto-dismiss timeout for resume notification (10 seconds in milliseconds)
  AUTO_DISMISS_TIMEOUT: 10000,

  // Auto-dismiss countdown start value (10 seconds)
  AUTO_DISMISS_COUNTDOWN: 10,
} as const

// Export individual constants for convenience
export const {
  PROGRESS_SAVE_INTERVAL,
  RESUME_THRESHOLD,
  AUTO_DISMISS_TIMEOUT,
  AUTO_DISMISS_COUNTDOWN,
} = RESUME_CONSTANTS
