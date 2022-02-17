import { ScopeContext } from '@sentry/types';
import * as Sentry from '@sentry/node';

const assignError = (maybeError: any) => {
  if (typeof maybeError === 'string') {
    return new Error(maybeError);
  }
  if (typeof maybeError === 'object') {
    const error = new Error(maybeError?.message ?? String(maybeError));
    if (maybeError?.stack) {
      error.stack = maybeError.stack;
    }
    if (maybeError?.code) {
      error.name = maybeError.code;
    }
    return error;
  }
  return maybeError;
};

export const logError = (error: Error | unknown) => {
  if (error instanceof Error) {
    Sentry.captureException(error);
  } else {
    Sentry.captureException(assignError(error), error);
  }
  console.error(error);
};

export const logInfo = (title: string, data: Partial<ScopeContext> = {}) => {
  Sentry.captureMessage(title, {
    level: Sentry.Severity.Info,
    contexts: {
      data: {
        message: title,
        ...data,
      },
    },
  });
};
