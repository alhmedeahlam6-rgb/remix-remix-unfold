export const ASSET_BASE = "/";

export const A = {
  map: ASSET_BASE + "full_map.glb",
  houses: [
    ASSET_BASE + "american_house.glb",
    ASSET_BASE + "house.glb",
    ASSET_BASE + "modern_luxury_villa_house_building_with_pool.glb",
  ],
  stores: [
    ASSET_BASE + "albaik_restaurant.glb",
    ASSET_BASE + "american_diner_(1).glb",
    ASSET_BASE + "lgb-optimized.glb",
  ],
  vehicles: [ASSET_BASE + "free_cyberpunk_hovercar.glb", ASSET_BASE + "free_merc_hovercar.glb"],
  // New rigged character (FBX). Loaded via FBXLoader.
  character: ASSET_BASE + "character_(1).fbx",
};

// All movement clips. Idle is FIRST so it plays before any T-pose can show.
export const MOVES = {
  idle: ASSET_BASE + "Breathing_Idle.fbx",
  walk: ASSET_BASE + "Ch03_nonPBR@Walking.fbx",
  run: ASSET_BASE + "Running.glb",
  jump: ASSET_BASE + "Jumping.glb",
  runJump: ASSET_BASE + "Running_Jump.glb",
  walkBack: ASSET_BASE + "Walking_Backwards.glb",
};

// Dance clips, triggered by number keys / F key
export const DANCES = [
  ASSET_BASE + "Hip_Hop_Dancing.glb",
  ASSET_BASE + "Hip_Hop_Dancing_(1).glb",
  ASSET_BASE + "Hip_Hop_Dancing_(2).glb",
  ASSET_BASE + "Hip_Hop_Dancing_(3).fbx",
  ASSET_BASE + "Hip_Hop_Dancing_(4).glb",
  ASSET_BASE + "Hip_Hop_Dancing_(5).glb",
  ASSET_BASE + "Gangnam_Style.glb",
  ASSET_BASE + "Chicken_Dance.glb",
  ASSET_BASE + "Moonwalk.fbx",
  ASSET_BASE + "Belly_Dance.glb",
  ASSET_BASE + "Booty_Hip_Hop_Dance.glb",
  ASSET_BASE + "Breakdance_1990.glb",
  ASSET_BASE + "Breakdance_Ending_3.fbx",
  ASSET_BASE + "Breakdance_Freeze_Var_4.glb",
  ASSET_BASE + "Breakdance_Uprock_To_Ground.glb",
  ASSET_BASE + "Dancing_Twerk.glb",
  ASSET_BASE + "Flair.glb",
  ASSET_BASE + "Headspin_Start.glb",
  ASSET_BASE + "House_Dancing.glb",
  ASSET_BASE + "Northern_Soul_Floor_Spin.glb",
  ASSET_BASE + "Robot_Hip_Hop_Dance.glb",
  ASSET_BASE + "Rumba_Dancing.glb",
  ASSET_BASE + "Salsa_Dancing.glb",
  ASSET_BASE + "Samba_Dancing.glb",
  ASSET_BASE + "Shopping_Cart_Dance.fbx",
  ASSET_BASE + "Snake_Hip_Hop_Dance.fbx",
  ASSET_BASE + "Step_Hip_Hop_Dance.glb",
  ASSET_BASE + "Swing_Dancing.fbx",
  ASSET_BASE + "Tut_Hip_Hop_Dance.glb",
  ASSET_BASE + "Wave_Hip_Hop_Dance.fbx",
  ASSET_BASE + "Arms_Hip_Hop_Dance.fbx",
];

export const GAME_ASSET_URLS = [
  A.map,
  ...A.houses,
  ...A.stores,
  ...A.vehicles,
  A.character,
  ...Object.values(MOVES),
  ...DANCES,
];
