function smoothingFactor(cutoff: number, elapsedSeconds: number): number {
  const timeConstant = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + timeConstant / elapsedSeconds);
}

export class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly derivativeCutoff: number;
  private value: number | null = null;
  private derivative = 0;
  private time = 0;

  constructor(minCutoff: number, beta: number, derivativeCutoff = 1) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.derivativeCutoff = derivativeCutoff;
  }

  reset() {
    this.value = null;
  }

  next(raw: number, timeMs: number): number {
    if (this.value === null) {
      this.value = raw;
      this.derivative = 0;
      this.time = timeMs;
      return raw;
    }
    const elapsed = Math.max((timeMs - this.time) / 1000, 0.001);
    const rawDerivative = (raw - this.value) / elapsed;
    this.derivative += smoothingFactor(this.derivativeCutoff, elapsed) * (rawDerivative - this.derivative);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.derivative);
    this.value += smoothingFactor(cutoff, elapsed) * (raw - this.value);
    this.time = timeMs;
    return this.value;
  }
}
