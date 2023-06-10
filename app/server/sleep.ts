const KEEP_AWAKE_MS = 10_000;

/**
 * Gets the time at which the process woke up
 */
export const wakeUpStatus = { wokeUpAt: Date.now() };

let sleepTimeout: NodeJS.Timeout;

/**
 * Keeps the process awake, preventing it from exiting
 */
export const keepAwake = () => {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (sleepTimeout) clearTimeout(sleepTimeout);
  sleepTimeout = setTimeout(() => process.exit(0), KEEP_AWAKE_MS);
};
