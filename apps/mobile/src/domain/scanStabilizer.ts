/**
 * Filtre les lectures de la caméra, qui arrivent plusieurs fois par seconde et
 * peuvent être erronées ou concerner plusieurs codes-barres visibles à la fois.
 *
 * Un code n'est validé que s'il a été relu plusieurs fois de suite à
 * l'identique ; ensuite la lecture est suspendue un court instant, et le même
 * code n'est pas revalidé tant qu'il reste devant l'objectif.
 */

export interface StabilizerOptions {
  /** Lectures identiques exigées pour un code déjà enregistré dans l'inventaire. */
  knownReads: number;
  /** Lectures identiques exigées pour un code inconnu (plus strict : c'est souvent une erreur de lecture). */
  unknownReads: number;
  /** Durée pendant laquelle les lectures d'un même code sont cumulées. */
  windowMs: number;
  /** Pause après une validation, le temps de lire le résultat à l'écran. */
  pauseMs: number;
  /** Le dernier code validé doit avoir quitté le champ depuis ce délai pour être relu. */
  releaseMs: number;
}

export const DEFAULT_STABILIZER_OPTIONS: StabilizerOptions = {
  knownReads: 3,
  unknownReads: 6,
  windowMs: 1200,
  pauseMs: 1500,
  releaseMs: 2000,
};

export class ScanStabilizer {
  private reads = new Map<string, number[]>();
  private pausedUntil = 0;
  private lastAccepted: string | null = null;
  private lastAcceptedSeenAt = 0;

  constructor(private readonly options: StabilizerOptions = DEFAULT_STABILIZER_OPTIONS) {}

  /**
   * Enregistre une lecture brute. Renvoie le code s'il vient d'être validé,
   * sinon null (lecture ignorée ou encore insuffisamment confirmée).
   */
  push(code: string, now: number, isKnown: boolean): string | null {
    if (!code) {
      return null;
    }
    if (code === this.lastAccepted && now - this.lastAcceptedSeenAt < this.options.releaseMs) {
      // Toujours devant l'objectif : on prolonge l'attente sans le revalider.
      this.lastAcceptedSeenAt = now;
      return null;
    }
    if (now < this.pausedUntil) {
      return null;
    }

    const recent = (this.reads.get(code) ?? []).filter((at) => now - at <= this.options.windowMs);
    recent.push(now);
    this.reads.set(code, recent);

    const required = isKnown ? this.options.knownReads : this.options.unknownReads;
    if (recent.length < required) {
      return null;
    }

    this.reads.clear();
    this.pausedUntil = now + this.options.pauseMs;
    this.lastAccepted = code;
    this.lastAcceptedSeenAt = now;
    return code;
  }

  /** Vrai pendant la pause qui suit une validation. */
  isPaused(now: number): boolean {
    return now < this.pausedUntil;
  }

  reset(): void {
    this.reads.clear();
    this.pausedUntil = 0;
    this.lastAccepted = null;
    this.lastAcceptedSeenAt = 0;
  }
}
