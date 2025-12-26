/**
 * Environment Configuration
 *
 * Validates required environment variables at application startup.
 * Fails fast if critical variables are missing.
 *
 * This ensures the application doesn't start in an invalid state,
 * preventing runtime errors and security issues.
 */

interface EnvironmentConfig {
  DATABASE_URL: string;
  PORT?: string;
  NODE_ENV?: string;
  // B4: Stripe configuration (optional - only required when Stripe is enabled)
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

/**
 * Required environment variables
 * These MUST be set for the application to function
 */
const REQUIRED_ENV_VARS = ['DATABASE_URL'] as const;

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  PORT: '3000',
  NODE_ENV: 'development',
} as const;

/**
 * Validate environment configuration
 *
 * Checks that all required environment variables are set and valid.
 * Throws an error with clear message if validation fails.
 *
 * @throws Error if required environment variables are missing or invalid
 */
export function validateEnvironment(): EnvironmentConfig {
  const missing: string[] = [];
  const invalid: Array<{ name: string; reason: string }> = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    } else {
      // Validate specific variables
      if (varName === 'DATABASE_URL') {
        if (
          !value.startsWith('postgresql://') &&
          !value.startsWith('postgres://')
        ) {
          invalid.push({
            name: varName,
            reason: 'Must start with postgresql:// or postgres://',
          });
        }
      }
    }
  }

  // Collect errors
  const errors: string[] = [];

  if (missing.length > 0) {
    errors.push(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  if (invalid.length > 0) {
    const invalidMessages = invalid.map(
      (item) => `${item.name}: ${item.reason}`,
    );
    errors.push(
      `Invalid environment variables:\n  - ${invalidMessages.join('\n  - ')}`,
    );
  }

  if (errors.length > 0) {
    const errorMessage = [
      '❌ Environment configuration validation failed:',
      '',
      ...errors,
      '',
      'Please set the required environment variables before starting the application.',
      'See apps/backend/README.md for environment variable documentation.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Return validated configuration
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    PORT: process.env.PORT || OPTIONAL_ENV_VARS.PORT,
    NODE_ENV: process.env.NODE_ENV || OPTIONAL_ENV_VARS.NODE_ENV,
  };
}

/**
 * Get environment configuration
 *
 * Returns the validated environment configuration.
 * Call validateEnvironment() first to ensure all required variables are set.
 *
 * @returns Environment configuration object
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    PORT: process.env.PORT || OPTIONAL_ENV_VARS.PORT,
    NODE_ENV: process.env.NODE_ENV || OPTIONAL_ENV_VARS.NODE_ENV,
  };
}
