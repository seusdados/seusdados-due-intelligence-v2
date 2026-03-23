/**
 * Seusdados Due Diligence - Resilience Utilities
 * Circuit breaker e retry com backoff exponencial
 */

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitOpenError extends Error {
  constructor(public readonly serviceName: string) {
    super(`Serviço ${serviceName} temporariamente indisponível`);
    this.name = 'CircuitOpenError';
  }
}

export class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private nextAttemptTime = 0;

  constructor(
    private readonly serviceName: string,
    private readonly options = {
      failureThreshold: 5,
      timeout: 30000,
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new CircuitOpenError(this.serviceName);
      }
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(): void {
    this.failures++;
    if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.timeout;
    }
  }

  getState(): string {
    return this.state;
  }
}

// Registry global
const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string): CircuitBreaker {
  if (!breakers.has(name)) {
    // Aumentar threshold para e-mails para evitar bloqueios prematuros
    const options = name.includes('email') || name.includes('resend')
      ? { failureThreshold: 10, timeout: 60000 }
      : { failureThreshold: 5, timeout: 30000 };
    breakers.set(name, new CircuitBreaker(name, options));
  }
  return breakers.get(name)!;
}

// Função para resetar um circuit breaker específico
export function resetCircuitBreaker(name: string): void {
  breakers.delete(name);
}

// Função para resetar todos os circuit breakers
export function resetAllCircuitBreakers(): void {
  breakers.clear();
}

export async function withCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>
): Promise<T> {
  return getCircuitBreaker(serviceName).execute(fn);
}

export async function withRetryAndBackoff<T>(
  fn: () => Promise<T>,
  options = { maxRetries: 3, initialDelay: 100, maxDelay: 10000 }
): Promise<T> {
  let delay = options.initialDelay;
  
  for (let attempt = 1; attempt <= options.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt > options.maxRetries) throw error;
      
      const jitter = delay * 0.1 * (Math.random() * 2 - 1);
      await new Promise(r => setTimeout(r, Math.min(delay + jitter, options.maxDelay)));
      delay *= 2;
    }
  }
  
  throw new Error('Max retries exceeded');
}

/**
 * Wrapper para adicionar timeout em chamadas externas
 * @param fn Função a ser executada
 * @param timeoutMs Timeout em milissegundos (padrão: 30s)
 * @param operationName Nome da operação para logging
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000,
  operationName: string = 'operation'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(operationName, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

export class TimeoutError extends Error {
  constructor(
    public readonly operationName: string,
    public readonly timeoutMs: number
  ) {
    super(`Operação '${operationName}' excedeu o timeout de ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Combina timeout, retry e circuit breaker para máxima resiliência
 */
export async function withResilientCall<T>(
  serviceName: string,
  fn: () => Promise<T>,
  options = {
    timeoutMs: 30000,
    maxRetries: 3,
    initialDelay: 100,
    maxDelay: 10000,
  }
): Promise<T> {
  return withCircuitBreaker(serviceName, () =>
    withRetryAndBackoff(
      () => withTimeout(fn, options.timeoutMs, serviceName),
      {
        maxRetries: options.maxRetries,
        initialDelay: options.initialDelay,
        maxDelay: options.maxDelay,
      }
    )
  );
}

export default { 
  CircuitBreaker, 
  CircuitOpenError, 
  TimeoutError,
  withCircuitBreaker, 
  withRetryAndBackoff,
  withTimeout,
  withResilientCall,
};
