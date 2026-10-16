/** Testable title/attract state machine. Real input consumes the demo exit and never starts play accidentally. */
export class Flow {
  constructor({ mobile = false } = {}) {
    this.mode = 'title';
    this.idle = 0;
    this.mobile = mobile;
    this.demoCycles = 0;
    this.endWait = 0;
  }
  physical() {
    this.idle = 0;
    if (this.mode === 'demo') {
      this.mode = 'title';
      this.endWait = 0;
      return true;
    }
    return false;
  }
  step(dt) {
    if (this.mode === 'title') {
      this.idle += Math.max(0, dt);
      if (this.idle >= 10) {
        this.mode = 'demo';
        this.idle = 0;
        return 'demo';
      }
    }
    return null;
  }
  play() {
    this.mode = 'play';
    this.idle = 0;
  }
  title() {
    this.mode = 'title';
    this.idle = 0;
    this.endWait = 0;
  }
  demo() {
    this.mode = 'demo';
    this.demoCycles++;
    this.idle = 0;
    this.endWait = 0;
  }
  ended(dt) {
    this.endWait += dt;
    if (this.endWait >= 4) {
      this.endWait = 0;
      return true;
    }
    return false;
  }
}
