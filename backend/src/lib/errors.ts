export type ErrorDetail = { field: string; message: string };

/**
 * Application error mapped 1:1 onto the API contract's error envelope:
 * { "error": { "code", "message", "details"?, ...extra } }
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetail[],
    public readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static validation(message: string, details?: ErrorDetail[]): AppError {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static emailTaken(): AppError {
    return new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
  }

  static invalidCredentials(): AppError {
    return new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  static emailNotVerified(): AppError {
    return new AppError(403, 'EMAIL_NOT_VERIFIED', 'Email address is not verified yet');
  }

  static invalidOtp(attemptsRemaining: number): AppError {
    return new AppError(400, 'INVALID_OTP', 'Invalid verification code', undefined, { attemptsRemaining });
  }

  static otpExpired(): AppError {
    return new AppError(410, 'OTP_EXPIRED', 'Verification code has expired');
  }

  static otpLocked(retryAfterSeconds: number): AppError {
    return new AppError(
      429,
      'OTP_LOCKED',
      'Too many failed attempts. This account is locked for 24 hours.',
      undefined,
      { retryAfterSeconds },
    );
  }

  static resendCooldown(retryAfterSeconds: number): AppError {
    return new AppError(429, 'RESEND_COOLDOWN', 'Please wait before requesting a new code', undefined, {
      retryAfterSeconds,
    });
  }

  static unauthorized(message = 'Missing or invalid authorization token'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static internal(message = 'Something went wrong'): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}
