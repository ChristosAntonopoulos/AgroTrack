import { registerRootComponent } from 'expo';

import App from './App';

// Global error handler to catch unhandled errors
try {
  const { ErrorUtils } = require('react-native');
  
  if (ErrorUtils && typeof ErrorUtils.getGlobalHandler === 'function') {
    const originalHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      // Check if it's a boolean casting error (more patterns)
      const isBooleanError = error.message?.includes('cannot be cast') || 
                            error.message?.includes('Boolean') ||
                            error.message?.includes('String cannot be cast') ||
                            error.message?.includes('java.lang.String') ||
                            error.message?.includes('java.lang.Boolean');
      
      if (isBooleanError) {
        console.error('\n🚨🚨🚨 GLOBAL BOOLEAN CASTING ERROR 🚨🚨🚨');
        console.error('===========================================');
        console.error('ERROR MESSAGE:', error.message);
        console.error('ERROR NAME:', error.name);
        console.error('IS FATAL:', isFatal);
        console.error('\n--- FULL ERROR OBJECT ---');
        console.error(error);
        console.error('\n--- ERROR STACK TRACE ---');
        console.error(error.stack || 'No stack trace available');
        console.error('\n--- ERROR PROPERTIES ---');
        try {
          const errorProps: any = {};
          Object.getOwnPropertyNames(error).forEach(prop => {
            try {
              errorProps[prop] = (error as any)[prop];
            } catch (e) {
              errorProps[prop] = '[Cannot access]';
            }
          });
          console.error(JSON.stringify(errorProps, null, 2));
        } catch (e) {
          console.error('Could not stringify error properties:', e);
        }
        
        // Log last rendered component context if available
        if (typeof (global as any).__lastRenderedComponent !== 'undefined') {
          console.error('\n--- LAST RENDERED COMPONENT CONTEXT ---');
          try {
            console.error(JSON.stringify((global as any).__lastRenderedComponent, null, 2));
          } catch (e) {
            console.error('Could not stringify component context:', e);
          }
        }
        
        console.error('\n--- ERROR CONTEXT ---');
        console.error('  - This is a native error from Java/Android');
        console.error('  - A string value was passed where a boolean was expected');
        console.error('  - Check recent component logs above for ⚠️ warnings');
        console.error('  - Look for components that recently logged props');
        console.error('  - Common native components: TouchableOpacity, RefreshControl, Modal, Switch');
        console.error('  - Check if stats/user data is null and causing boolean coercion issues');
        console.error('===========================================\n');
      } else {
        console.error('Global Error Handler:', error.message, 'Fatal:', isFatal);
      }
      
      // Call original handler
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }
} catch (error) {
  console.warn('Could not set up global error handler:', error);
}

// Handle unhandled promise rejections
if (typeof global !== 'undefined') {
  const originalUnhandledRejection = global.onunhandledrejection;
  
  global.onunhandledrejection = function(event: any) {
    const reason = event?.reason || event;
    const isBooleanError = reason?.message?.includes('cannot be cast') || 
                          reason?.message?.includes('Boolean') ||
                          reason?.message?.includes('String cannot be cast') ||
                          reason?.message?.includes('java.lang.String') ||
                          reason?.message?.includes('java.lang.Boolean');
    
    if (isBooleanError) {
      console.error('\n🚨🚨🚨 UNHANDLED PROMISE REJECTION - BOOLEAN ERROR 🚨🚨🚨');
      console.error('===========================================');
      console.error('REASON:', reason);
      console.error('REASON TYPE:', typeof reason);
      if (reason instanceof Error) {
        console.error('ERROR MESSAGE:', reason.message);
        console.error('ERROR NAME:', reason.name);
        console.error('ERROR STACK:', reason.stack);
      } else {
        console.error('REASON (stringified):', String(reason));
      }
      console.error('\n--- ERROR CONTEXT ---');
      console.error('  - This error occurred in an async operation');
      console.error('  - Check recent component logs for prop type warnings');
      console.error('  - Look for components that logged props before this error');
      console.error('===========================================\n');
    }
    
    if (originalUnhandledRejection) {
      originalUnhandledRejection.call(this, event);
    }
  };
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
