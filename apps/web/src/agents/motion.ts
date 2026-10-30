import { POSTURE_SECONDS, routeBetween, simplifyRoute, WALK_SPEED, type Place, type XZ } from '@office/shared'

export type MotionPhase = 'settled' | 'rising' | 'walking' | 'sitting'

const TURN_RATE = 9
const lerpAngle = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k

/**
 * Moves one avatar between places along the shared walkable graph: stand up, walk,
 * turn to face the seat, sit down. The server uses the same routes to know when the
 * agent arrives, so the browser only has to walk at WALK_SPEED × simulation speed.
 */
export class AgentMotion {
  x: number
  z: number
  yaw: number
  /** 0 = standing … 1 = seated. */
  sit: number
  phase: MotionPhase = 'settled'
  /** Distance walked, drives the leg cycle. */
  stride = 0
  place: Place
  private origin: Place
  private route: XZ[] = []
  private seg = 0
  private segT = 0

  constructor(place: Place) {
    this.place = place
    this.origin = place
    ;[this.x, this.z] = place.position
    this.yaw = place.rotationY
    this.sit = place.pose === 'sit' ? 1 : 0
  }

  goTo(place: Place) {
    if (place.key === this.place.key) return
    const moving = this.phase === 'walking' || this.phase === 'rising'
    let route: XZ[]
    if (moving) {
      // Change of plan mid-walk: retrace the steps taken so far, then take the normal route.
      const back: XZ[] = [[this.x, this.z], ...this.route.slice(0, this.seg + 1).reverse()]
      route = simplifyRoute([...back, ...routeBetween(this.origin, place).slice(1)])
    } else {
      this.origin = this.place
      route = routeBetween(this.place, place)
    }
    this.place = place
    this.route = route
    this.seg = 0
    this.segT = 0
    this.phase = this.sit > 0.01 ? 'rising' : 'walking'
  }

  /** Advance by dt seconds of wall-clock time at the given simulation speed. */
  update(dt: number, speed: number) {
    const postureStep = (dt * speed) / POSTURE_SECONDS
    if (this.phase === 'rising') {
      this.sit = Math.max(0, this.sit - postureStep)
      if (this.sit === 0) this.phase = 'walking'
    }
    if (this.phase === 'walking') this.walk(dt * speed * WALK_SPEED, dt)
    if (this.phase === 'sitting' || this.phase === 'settled') {
      this.yaw = lerpAngle(this.yaw, this.place.rotationY, 1 - Math.exp(-dt * TURN_RATE))
    }
    if (this.phase === 'sitting') {
      this.sit = Math.min(1, this.sit + postureStep)
      if (this.sit === 1) this.phase = 'settled'
    }
  }

  private walk(distance: number, dt: number) {
    let budget = distance
    while (budget > 0 && this.seg < this.route.length - 1) {
      const [ax, az] = this.route[this.seg]
      const [bx, bz] = this.route[this.seg + 1]
      const len = Math.hypot(bx - ax, bz - az)
      const left = (1 - this.segT) * len
      if (budget >= left || len < 1e-4) {
        budget -= left
        this.seg++
        this.segT = 0
      } else {
        this.segT += budget / len
        budget = 0
      }
    }
    this.stride += distance
    if (this.seg >= this.route.length - 1) {
      ;[this.x, this.z] = this.route[this.route.length - 1]
      this.phase = this.place.pose === 'sit' ? 'sitting' : 'settled'
      return
    }
    const [ax, az] = this.route[this.seg]
    const [bx, bz] = this.route[this.seg + 1]
    this.x = ax + (bx - ax) * this.segT
    this.z = az + (bz - az) * this.segT
    this.yaw = lerpAngle(this.yaw, Math.atan2(bx - ax, bz - az), 1 - Math.exp(-dt * TURN_RATE))
  }
}
