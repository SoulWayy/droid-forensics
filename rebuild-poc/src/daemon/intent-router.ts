export type Intent = 'DIAGNOSTIC' | 'IMPLEMENTATION';

export class IntentRouter {
  /**
   * Phase 0: Simple Intent Gate
   * Evaluates the prompt to determine if it will modify code (Implementation)
   * or just analyze/read (Diagnostic).
   */
  public static evaluate(prompt: string): Intent {
    const implementationKeywords = [
      'fix', 'build', 'create', 'update', 'delete', 'write', 'implement', 'refactor', 'install', 'add'
    ];
    
    const p = prompt.toLowerCase();
    for (const kw of implementationKeywords) {
      if (p.includes(kw)) {
        return 'IMPLEMENTATION';
      }
    }
    
    // Default to Diagnostic if no clear implementation intent is found
    return 'DIAGNOSTIC';
  }
}
