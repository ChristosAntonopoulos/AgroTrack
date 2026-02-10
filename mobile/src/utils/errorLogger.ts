/**
 * Centralized error logging utility
 * Provides consistent error logging with context information
 */

interface ErrorContext {
  component?: string;
  screen?: string;
  action?: string;
  props?: Record<string, any>;
  state?: Record<string, any>;
}

class ErrorLogger {
  private formatError(error: Error, context?: ErrorContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context
      ? `\nContext: ${JSON.stringify(context, null, 2)}`
      : '';
    
    return `
[${timestamp}] ERROR
Message: ${error.message}
Stack: ${error.stack}${contextStr}
    `.trim();
  }

  logError(error: Error | unknown, context?: ErrorContext): void {
    const err = error instanceof Error ? error : new Error(String(error));
    
    const formattedError = this.formatError(err, context);
    console.error(formattedError);
    
    // In production, you might want to send this to a logging service
    // Example: Sentry.captureException(err, { extra: context });
  }

  logWarning(message: string, context?: ErrorContext): void {
    const timestamp = new Date().toISOString();
    const contextStr = context
      ? `\nContext: ${JSON.stringify(context, null, 2)}`
      : '';
    
    console.warn(`
[${timestamp}] WARNING
Message: ${message}${contextStr}
    `.trim());
  }

  logInfo(message: string, context?: ErrorContext): void {
    const timestamp = new Date().toISOString();
    const contextStr = context
      ? `\nContext: ${JSON.stringify(context, null, 2)}`
      : '';
    
    console.log(`
[${timestamp}] INFO
Message: ${message}${contextStr}
    `.trim());
  }

  validateBooleanProp(
    propName: string,
    value: any,
    componentName: string,
    defaultValue: boolean = false
  ): boolean {
    try {
      // Fast path: already a boolean
      if (typeof value === 'boolean') {
        return value;
      }
      
      // Fast path: undefined or null
      if (value === undefined || value === null) {
        return defaultValue;
      }
      
      // Warn if value is not a boolean (but don't break the app)
      try {
        this.logWarning(
          `Invalid boolean prop "${propName}" in ${componentName}. Received: ${typeof value} (${value}). Using default: ${defaultValue}`,
          { component: componentName, prop: propName, value, defaultValue }
        );
      } catch (logError) {
        // If logging fails, just continue - don't break the component
        console.warn(`Failed to log warning for ${componentName}.${propName}`);
      }
      
      // Convert string "true"/"false" to boolean
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase().trim();
        if (lowerValue === 'true' || lowerValue === '1') {
          return true;
        }
        if (lowerValue === 'false' || lowerValue === '0' || lowerValue === '') {
          return false;
        }
      }
      
      // Convert number to boolean
      if (typeof value === 'number') {
        return value !== 0;
      }
      
      // Fallback to default - always return a valid boolean
      return defaultValue;
    } catch (error) {
      // If anything goes wrong, return the default value
      // This ensures the component never breaks due to prop validation
      console.error(`Error validating boolean prop ${propName} in ${componentName}:`, error);
      return defaultValue;
    }
  }
}

export const errorLogger = new ErrorLogger();
export default errorLogger;
