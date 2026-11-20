# Hollow Lake

A browser fishing game built with npm and Vite. Cast from the dock, wait out the nibbles, strike on the bite, then win a tension fight to land the fish.

## Run it

```bash
npm install
npm run dev      # open the URL Vite prints, http://localhost:4747
npm test         # game logic tests
npm run build    # production build in dist/
```

## How to play

- **Cast:** hold Space, or press and hold on the lake, then release. The meter swings, so time your release.
- **Wait:** the hook sinks to your rod's reach. Hold to drag it back slowly.
- **Nibbles vs. bites:** the bobber dips on nibbles. Striking then spooks the fish. Strike when the big "!" appears.
- **Reel:** hold to reel in. Let go when tension hits red or the fish thrashes. Too much slack and it spits the hook. The orange bar under the tension meter is the fish's stamina, which drains as you fight.
- **Cut line:** press **R**, **Esc**, or the Cut line button to abandon any cast or fight.
- **Sell, cook, or release:** sell for cash now, put the fish in the smoker to sell later for up to 2.8× as much, or release it for karma, which raises your luck.
- **Rowboat:** buy one in the shop, then row with **A**/**D**, the arrow keys, or the on-screen buttons. Fishing from the boat puts you right over deep water.
- **Shirts:** the shop sells 12 shirts, from $25 solid colors to Sailor Stripes, Lake Camo, a Hi-Vis Vest that glows at night, and an $800 Rainbow Tie-Dye that cycles through colors. They're purely cosmetic. Buy once, then swap anytime.
- **Kitchen (K):** the smoker. Fish go from Raw to Seared, Grilled, Smoked, and Cured the longer they cook. Build more racks to cook more at once. The kitchen also shows today's market specials, two species that sell for double each day.
- **Crew (C):** hire up to three hands who fish the shallows off-screen. They only catch small fish and junk, and stop when their basket is full, so they're pocket change next to real fishing.
- **S** opens the shop, **K** the kitchen, **C** the crew, **J** the journal, **M** toggles sound. The journal has a Reset progress button.

## What's in the lake

24 species across seven rarities, including sharks and mythic sea monsters: Bull Shark, Lantern Hammerhead, Great White, Megalodon, the Hollow Kraken, and the Lake Serpent. The Chum Bucket lure attracts sharks, and the Abyssal Harpoon Rod is built for the mythics. Which fish appear depends on depth, time of day, and weather. The day/night cycle lasts five real minutes and the weather shifts between clear, cloudy, rain, and storm. Legends like Old Gnarlfin only show up deep, at night, in a storm, and need the best rod to land. Junk gets snagged when your hook rests on the lakebed, and some of it is worth money.

## npm packages

| Package | Used for |
| --- | --- |
| vite | Dev server and production build |
| vitest | Unit tests plus bots that play the real engine for hours |
| simplex-noise | Waves, fish swimming paths, and fight patterns |
| canvas-confetti | Celebrations for epic and legendary catches |

All graphics are drawn on a canvas and all sound is synthesized with the Web Audio API, so there are no image or audio files. Progress saves to localStorage.

## How it's built and tested

`src/game.js` is a headless engine with no DOM or audio. The page feeds it input, then plays the sounds and shows the messages it emits as events. A watchdog inside the engine detects impossible states and recovers instead of freezing.

`src/economy.js` holds cooking, market specials, and the crew as pure functions.

`npm test` runs bots against that engine. A skilled bot plays for hours of game time, a chaos bot mashes the button at random, and scripted scenarios cover nibbles, missed bites, cutting the line, monster fights, rowing, casting from every boat position, cooking, the crew, corrupted saves, and bad frame timings. One test checks that a full crew earns under a quarter of what a player earns by fishing. Every frame is checked against invariants such as "a fight always ends" and "the hook stays in the water".
