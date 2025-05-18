/**
 * Debug utilities to help with troubleshooting
 */

export const logHttpRequest = (request: Request, source: string) => {
  console.log(`[${source}] Request received: ${new Date().toISOString()}`);
  console.log(`[${source}] Request URL: ${request.url}`);
  console.log(`[${source}] Request method: ${request.method}`);
  console.log(`[${source}] Request headers: ${JSON.stringify(Object.fromEntries([...request.headers]))}`);
};

export const logAuthResult = (user: any, error: any, source: string) => {
  if (user) {
    console.log(`[${source}] Authenticated user: ${user.id}`);
  } else {
    console.log(`[${source}] Anonymous user request. ${error ? 'Error: ' + error.message : 'No error'}`);
  }
};

export const logApiOperation = (message: string, jobId: string | null = null, data: any = null) => {
  const jobIdStr = jobId ? ` JOB ${jobId}` : '';
  console.log(`[API${jobIdStr}] ${message}`);
  if (data) {
    console.log(`[API${jobIdStr}] Data:`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  }
};

export const logError = (message: string, error: any, jobId: string | null = null) => {
  const jobIdStr = jobId ? ` JOB ${jobId}` : '';
  console.error(`[API${jobIdStr}] Error - ${message}:`, error);
}; 