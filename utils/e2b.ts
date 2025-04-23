import { Sandbox } from '@e2b/code-interpreter';

// Store sandboxes by session ID
const sandboxStore = new Map<string, Sandbox>();

export async function getSandbox(sessionId: string): Promise<Sandbox> {
  // Check if we already have a sandbox for this session
  if (sandboxStore.has(sessionId)) {
    return sandboxStore.get(sessionId)!;
  }
  
  // Create a new sandbox
  const sandbox = await Sandbox.create({
    apiKey: process.env.E2B_API_KEY,
  });
  
  // Store for reuse
  sandboxStore.set(sessionId, sandbox);
  
  // Set expiry - automatically close sandbox after 30 minutes of inactivity
  setTimeout(() => {
    if (sandboxStore.has(sessionId)) {
      const sandbox = sandboxStore.get(sessionId)!;
      sandbox.kill();
      sandboxStore.delete(sessionId);
    }
  }, 30 * 60 * 1000);
  
  return sandbox;
}

export async function closeSandbox(sessionId: string): Promise<void> {
  if (sandboxStore.has(sessionId)) {
    const sandbox = sandboxStore.get(sessionId)!;
    await sandbox.kill();
    sandboxStore.delete(sessionId);
  }
}

// Helper function to run code
export async function runCode(
  sandbox: Sandbox, 
  code: string, 
  language: 'python' | 'javascript' = 'javascript'
) {
  return await sandbox.runCode(code, { language });
}