/** Values shared between the steps of one scenario (replaces ThreadLocalManager). A new instance per scenario. */
export class ScenarioContext {
  private readonly values = new Map<string, unknown>();

  set(key: string, value: unknown): void {
    this.values.set(key, value);
  }

  get<T = unknown>(key: string): T {
    if (!this.values.has(key)) {
      const stored = this.keys().join(', ') || '(none)';
      throw new Error(`Scenario value '${key}' was never stored. Stored keys: ${stored}`);
    }
    return this.values.get(key) as T;
  }

  has(key: string): boolean {
    return this.values.has(key);
  }

  keys(): string[] {
    return [...this.values.keys()].sort();
  }
}
