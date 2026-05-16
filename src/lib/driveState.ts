// Shared state for vehicle driving mode.
// Vehicle component owns the car transform; ThirdPersonPlayer reads `active`
// to suppress its own input and ride along.
export const driveState = {
  active: false,
  // Latest car transform (world space).
  x: 0,
  y: 0.3,
  z: 0,
  yaw: 0,
  // Where the player should sit when mounted (offset above car center).
  seatOffsetY: 0.3,
  // Set by Vehicle, read by ThirdPersonPlayer for proximity hints.
  carX: 0,
  carZ: 0,
};
