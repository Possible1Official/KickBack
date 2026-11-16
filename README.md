# Kickback

A browser action game where gun recoil is your movement engine. Play a ten-level story campaign or climb endless waves across eight arenas. No install, build step, or external runtime dependencies.

## Run locally

Serve this directory, for example with `python -m http.server 8000`, then open `http://localhost:8000`. Use a keyboard and mouse, or the mobile touch controls. Progress, settings, and arena records save in this browser's local storage.

## Reactor update

**ARENAS** on the home menu opens eight maps, including the new **Overgrown Reactor**. Its background is generated pixel art, exported as a 151 KB WebP; solid foreground platforms use existing industrial tile art. Source prompt and provenance are in `assets/generated/README.md`.

In arena mode, a kill awards 100 points times your current combo. Defeat another enemy within four seconds to increase the multiplier up to x5. Taking damage, returning to the entrance, or letting the timer expire resets the combo. Pausing freezes it. Wave results include your score and best multiplier; personal best wave scores save per map and Flight Assist setting. Story progression and weapon challenges remain separate.

Enemies now show a dashed amber aiming line for 0.65 seconds before firing. Their aim locks when the warning begins so you can dodge. Intact platforms and closed doors block their sight; destroyed cover and opened doors create new firing lanes. Cover also absorbs hostile bullets before player damage is tested.

## Phone and tablet controls

Touch anywhere on the play area to create a floating joystick at that exact point. Drag in the direction you want to move; the gun automatically shoots the opposite way. The joystick disappears when you lift your finger, and each new touch creates a fresh origin. A small dead zone prevents accidental shots from a stationary thumb. This works regardless of the saved desktop control mode.

Use your other thumb on **CHARGE** (hold and release), **BRAKE** (hold), or the previous/next weapon buttons. You can keep moving the joystick while using an action. A charge keeps your last joystick direction if you lift the movement thumb before releasing it. The pause button is always available during gameplay. Pausing, switching apps, rotating the phone, and cancelled touches release held controls safely.

Landscape gives the largest play area. Portrait preserves the world's proportions and places controls in the space around it. Menus scroll independently; touching the game does not scroll the page.

## Flight control update

- **Directional recoil** (default): WASD / arrows fire opposite your intended movement. Mouse aiming takes over when you release the direction keys.
- **Mouse aim** (Settings): aim independently and hold left click to fire. Your gun's recoil still provides all propulsion.
- **Space or right mouse**: hold to charge, release for a stronger shot. Charging pauses automatic fire; wait through the weapon's cooldown before releasing.
- **Shift**: air brake reduces momentum and spin. A full charge lasts about 1.4 seconds; regeneration starts 0.8 seconds after braking stops. Release Shift after depletion to re-arm it. Braking does not protect against damage or cancel gravity.
- **Q / E or mouse wheel**: cycle usable weapons, including the campaign loan rifle. **1–7** selects a specific gun.
- **R** returns to the entrance with current health; **Esc** pauses. Losing focus automatically pauses and releases controls.

Arena clear screens show time, shots, accuracy, and rescues. Accuracy counts shots that hit an enemy, so shotgun pellets cannot inflate it. Highest cleared wave and fastest clear for each wave save per arena, with separate records for Flight Assist on/off. Rescued runs count toward wave clears but cannot set best times. Story runs do not affect arena records. These are local personal records, not online leaderboards.

The story and its weapon-unlock challenges remain intact. Multiplayer is not implemented; the current simulation runs locally in one browser.

## Code map

| File | Responsibility |
| --- | --- |
| `game.js` | Fixed-step physics, combat, input, and rendering |
| `levels.js`, `maps.js` | Arena geometry and themes |
| `menu.js`, `menu.css` | Screens, settings, and menu audio |
| `campaign.js`, `campaign.css` | Story and weapon progression |
| `touch-controls.js`, `mobile.css` | Floating joystick, multi-touch actions, phone layouts |
| `records.js` | Local arena performance and records |
| `tests/` | Dependency-free gameplay regression checks |

Run all checks with `node tests/run.cjs`. GitHub Actions runs them on pushes and pull requests. The checks execute real game functions inside a minimal browser mock; they do not replace visual playtesting.
