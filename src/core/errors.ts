/** Configuration is missing or invalid. The message always names the file or key to fix. */
export class ConfigError extends Error {
  override name = 'ConfigError';
}

/** A locator string could not be parsed. */
export class LocatorSyntaxError extends Error {
  override name = 'LocatorSyntaxError';
}

/** A locator key was referenced that no locator file defines. */
export class UnknownLocatorError extends Error {
  override name = 'UnknownLocatorError';
}

/** None of a locator's candidates matched an element. */
export class LocatorNotFoundError extends Error {
  override name = 'LocatorNotFoundError';
}

/** A WaitUtils condition did not become true in time. */
export class TimeoutError extends Error {
  override name = 'TimeoutError';
}

/** A ${...} placeholder could not be resolved. */
export class InterpolationError extends Error {
  override name = 'InterpolationError';
}
