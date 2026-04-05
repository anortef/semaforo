export interface SecurityLogger {
  loginSuccess(userId: string, email: string): void;
  loginFailure(email: string): void;
  unauthorizedAccess(path: string): void;
  apiKeyCreated(environmentId: string, keyId: string): void;
  apiKeyDeleted(keyId: string): void;
}

function timestamp(): string {
  return new Date().toISOString();
}

export function createSecurityLogger(): SecurityLogger {
  return {
    loginSuccess(userId, email) {
      console.log(`[${timestamp()}] SECURITY LOGIN_SUCCESS userId=${userId} email=${email}`);
    },
    loginFailure(email) {
      console.warn(`[${timestamp()}] SECURITY LOGIN_FAILURE email=${email}`);
    },
    unauthorizedAccess(path) {
      console.warn(`[${timestamp()}] SECURITY UNAUTHORIZED path=${path}`);
    },
    apiKeyCreated(environmentId, keyId) {
      console.log(`[${timestamp()}] SECURITY APIKEY_CREATED environmentId=${environmentId} keyId=${keyId}`);
    },
    apiKeyDeleted(keyId) {
      console.log(`[${timestamp()}] SECURITY APIKEY_DELETED keyId=${keyId}`);
    },
  };
}
