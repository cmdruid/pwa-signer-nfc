export class Mutex {
  private queue  : Array<() => void> = []
  private locked : boolean           = false

  /**
   * Acquires a lock, returning a promise that resolves when the lock is available
   */
  async acquire(): Promise<{ release: () => void }> {
    if (!this.locked) {
      this.locked = true;
      return { release: this.release.bind(this) }
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.locked = true
        resolve({ release: this.release.bind(this) })
      })
    })
  }

  /**
   * Releases the lock and resolves the next waiting promise if any
   */
  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()
      if (next) {
        next()
      }
    } else {
      this.locked = false
    }
  }

  /**
   * Checks if the mutex is currently locked
   */
  isLocked(): boolean {
    return this.locked
  }
}