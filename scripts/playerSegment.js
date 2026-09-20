// Hält nur noch die Dreh-Physik eines Körperteils (aktuell: Torso-Lean). x/y/length und
// getEndPoint() gab es früher für die prozedurale Rechteck-Darstellung der Ragdoll-Segmente -
// seit dem Umstieg auf Sprite-Rendering (siehe getBodyPose() in game.js) werden nur noch
// angle/angularVel gebraucht.
export class PlayerSegment {
  constructor(angle) {
    this.angle = angle;       // aktueller Winkel (0 = senkrecht nach unten, im Uhrzeigersinn positiv)
    this.angularVel = 0;      // Rotationsgeschwindigkeit
  }
}
