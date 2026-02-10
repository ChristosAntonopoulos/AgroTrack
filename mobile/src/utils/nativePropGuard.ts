/**
 * Native Prop Guard Utility
 * 
 * Wraps native component prop assignments with try-catch blocks
 * to identify exactly where boolean casting errors occur.
 * 
 * This helps debug "java.lang.String cannot be cast to java.lang.Boolean" errors
 * by catching them at the exact point where props are passed to native components.
 */

import React from 'react';

/**
 * Safely assigns a prop to a native component, catching and logging any casting errors
 * @param componentName - Name of the component (e.g., 'TouchableOpacity', 'Modal')
 * @param propName - Name of the prop (e.g., 'disabled', 'visible', 'refreshing')
 * @param propValue - The value to assign
 * @param context - Additional context string for debugging
 * @returns The prop value (unchanged, but validated)
 */
export const safeNativeProp = <T>(
  componentName: string,
  propName: string,
  propValue: T,
  context?: string
): T => {
  try {
    // Validate boolean props specifically
    if (propName === 'disabled' || propName === 'visible' || propName === 'refreshing' || 
        propName === 'editable' || propName === 'transparent' || propName === 'loading') {
      const propType = typeof propValue;
      
      if (propType !== 'boolean' && propValue !== undefined && propValue !== null) {
        const contextStr = context ? ` in ${context}` : '';
        console.error(
          `\n⚠️ [safeNativeProp] Non-boolean value detected${contextStr}:\n` +
          `  Component: ${componentName}\n` +
          `  Prop: ${propName}\n` +
          `  Type: ${propType}\n` +
          `  Value: ${propValue}\n` +
          `  This will cause a casting error when passed to native component!\n`
        );
      }
    }
    
    return propValue;
  } catch (error: any) {
    const contextStr = context ? ` in ${context}` : '';
    console.error(
      `\n🚨 [safeNativeProp] Error validating prop${contextStr}:\n` +
      `  Component: ${componentName}\n` +
      `  Prop: ${propName}\n` +
      `  Value: ${propValue}\n` +
      `  Error: ${error.message}\n`
    );
    throw error;
  }
};

/**
 * Wraps a component render function with error handling
 * Catches errors during render and logs detailed information
 */
export const withNativePropErrorHandling = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.FC<P> => {
  return (props: P) => {
    try {
      // Log all boolean props before render
      if (__DEV__) {
        const booleanProps = ['disabled', 'visible', 'refreshing', 'editable', 'transparent', 'loading'];
        booleanProps.forEach(propName => {
          if (propName in props) {
            const propValue = (props as any)[propName];
            const propType = typeof propValue;
            if (propType !== 'boolean' && propValue !== undefined && propValue !== null) {
              console.error(
                `\n⚠️ [${componentName}] Non-boolean ${propName} prop detected:\n` +
                `  Type: ${propType}\n` +
                `  Value: ${propValue}\n`
              );
            }
          }
        });
      }
      
      return <Component {...props} />;
    } catch (error: any) {
      const isBooleanError = error?.message?.includes('cannot be cast') ||
                           error?.message?.includes('Boolean') ||
                           error?.message?.includes('java.lang.String') ||
                           error?.message?.includes('java.lang.Boolean');
      
      if (isBooleanError) {
        console.error(
          `\n🚨🚨🚨 BOOLEAN CASTING ERROR IN ${componentName} 🚨🚨🚨\n` +
          `===========================================\n` +
          `Component: ${componentName}\n` +
          `Error: ${error.message}\n` +
          `Props: ${JSON.stringify(props, null, 2)}\n` +
          `Stack: ${error.stack}\n` +
          `===========================================\n`
        );
      }
      
      throw error;
    }
  };
};

/**
 * Creates a safe wrapper for native component props
 * Validates and logs props before they're passed to native components
 */
export const createSafeNativeProps = <T extends Record<string, any>>(
  props: T,
  componentName: string,
  context?: string
): T => {
  const safeProps = { ...props };
  
  // Validate all boolean props
  const booleanPropNames = ['disabled', 'visible', 'refreshing', 'editable', 'transparent', 'loading'];
  
  booleanPropNames.forEach(propName => {
    if (propName in safeProps) {
      try {
        safeProps[propName] = safeNativeProp(
          componentName,
          propName,
          safeProps[propName],
          context
        );
      } catch (error: any) {
        const contextStr = context ? ` in ${context}` : '';
        console.error(
          `\n🚨 [createSafeNativeProps] Error with ${propName} prop${contextStr}:\n` +
          `  Component: ${componentName}\n` +
          `  Prop: ${propName}\n` +
          `  Value: ${safeProps[propName]}\n` +
          `  Error: ${error.message}\n`
        );
        throw error;
      }
    }
  });
  
  return safeProps;
};
