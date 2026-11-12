// One Euro filter (Casiez, Roussel, Vogel 2012): a low-pass filter whose cutoff rises with speed.
// Standing still -> low cutoff -> jitter is smoothed away. Moving fast -> high cutoff -> almost no lag.
//   minCutoff  cutoff in Hz at rest. Lower = steadier but lazier at the start of a movement.
//   beta       how quickly the cutoff opens up with speed (Hz per unit/second). Higher = less lag when moving.
//   dCutoff    cutoff for the speed estimate itself.
// No dependencies, so the same code runs in the browser and in the Node benchmark.

const alphaFor = (dt, cutoff) => { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); };

class Adaptive {
  constructor({ minCutoff = 1.5, beta = 0, dCutoff = 1 } = {}) {
    this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff; this.speed = 0;
  }
  reset() { this.speed = 0; }
  // distance moved since the last filtered value -> blend factor (0..1) for this step
  alpha(distance, dt) {
    const raw = distance / dt;
    this.speed += (raw - this.speed) * alphaFor(dt, this.dCutoff);
    return alphaFor(dt, this.minCutoff + this.beta * this.speed);
  }
}

// One number.
export class OneEuro extends Adaptive {
  constructor(opts) { super(opts); this.value = null; }
  reset(value = null) { super.reset(); this.value = value; }
  filter(x, dt) {
    if (this.value === null) { this.value = x; return x; }
    this.value += (x - this.value) * this.alpha(Math.abs(x - this.value), dt);
    return this.value;
  }
}

// A point or vector with x, y, z (a THREE.Vector3 works). The whole vector shares one blend factor, driven by
// its speed through space, so the filtered point moves straight towards the target instead of axis by axis.
export class OneEuroVec3 extends Adaptive {
  // Moves `state` towards `target` in place.
  step(state, target, dt) {
    const dx = target.x - state.x, dy = target.y - state.y, dz = target.z - state.z;
    const a = this.alpha(Math.hypot(dx, dy, dz), dt);
    state.x += dx * a; state.y += dy * a; state.z += dz * a;
    return state;
  }
}

// A rotation. `state` and `target` are THREE.Quaternion-like (need angleTo and slerp); speed is in radians/second.
export class OneEuroQuat extends Adaptive {
  step(state, target, dt) {
    state.slerp(target, this.alpha(state.angleTo(target), dt));
    return state;
  }
}

// Seconds between two millisecond timestamps, kept inside a sane range (a stalled tab must not explode the maths).
export const stepSeconds = (now, last) => Math.min(0.2, Math.max(1 / 240, (now - last) / 1000));
