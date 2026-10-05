// Génère tools/lot-creatures-1..4.js, lot-boutique.js et lot-boutique-b.js à partir de l'en-tête commun de lot-promo.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/lot-promo.js', 'utf8');
const head = src.slice(0, src.indexOf('HC.LOT = ')), foot = src.slice(src.indexOf('(async () => {'));
const RAW = 'https://raw.githubusercontent.com/Lucid-Studio-Code/hustle-city/main/assets/img/';
const S = "2D mobile game art, polished cartoon illustration, thick dark brown outlines, bold saturated colors, soft cel shading with subtle highlights, clean vector-like rendering, high detail, a bit more urban street style. ";
const NO = " No text, no letters, no numbers, no words, no logos, no brands, no dollar sign.";
const FRAME = {
  C: 'simple sturdy card frame in worn concrete grey with a thin teal inner border and a faint graffiti tag pattern',
  R: 'card frame in deep royal blue with gold corner pieces and a subtle graffiti pattern, exactly like the reference card',
  E: 'shiny holographic rainbow foil card frame with ornate silver filigree, like the reference holo card',
  L: 'thick ornate gold card frame with engraved details and small gems in the corners, glowing aura'
};
const REF = { C: RAW + 'item-c-dragon.png', R: RAW + 'item-c-dragon.png', E: RAW + 'item-c-holo.png', L: RAW + 'item-c-1st.png' };
const card = (r, desc) => S + `A complete fantasy creature trading card seen perfectly straight from the front, flat, upright rectangle with rounded corners, same card design language and same art style as the reference card: ${FRAME[r]}. Inside the picture window: ${desc}. The creature is the hero, big, expressive, dynamic pose, rich detailed background that matches it. Small blank round emblems in two corners. The bottom quarter of the card is a plain blank name plate (empty, no writing). Single card centered on a plain pure white background.` + NO;
const C = [
  ['ratchou', 'C', 'a small grey street rat wearing a backwards cap and an oversized hoodie, holding a slice of pizza, cheeky grin, in a city alley at dusk'],
  ['pigeonnard', 'C', 'a chubby city pigeon with a tiny gold chain and a cocky attitude, strutting on a sidewalk, puffed chest'],
  ['kebabzor', 'C', 'a cute little monster shaped like a kebab wrap sandwich with tiny arms and big happy eyes, dripping white sauce, next to a food truck at night'],
  ['trotilezard', 'C', 'a green lizard riding an electric scooter at full speed in a city street, tongue out, motion lines'],
  ['matouz', 'C', 'a scruffy alley cat with a red bandana and one torn ear, sitting on a trash can lid, smug half-closed eyes'],
  ['escargoat', 'C', 'a proud snail whose shell is covered in colourful graffiti and topped with a tiny crown, sliding on a wet pavement'],
  ['taupecash', 'C', 'a mole wearing a miner helmet with a lamp, digging up a pile of plain green banknotes from the ground, delighted'],
  ['grenouf', 'C', 'a frog DJ with big headphones scratching a turntable set on a lily pad, party lights over a pond'],
  ['moustikass', 'C', 'an annoying mosquito wearing tiny sunglasses buzzing around a streetlight at night, mischievous'],
  ['canardo', 'C', 'a duck in a puffy down jacket and beanie, waddling through the snow in a city park'],
  ['poubellou', 'C', 'a raccoon popping out of a city trash bin with a banana peel on its head, proud of its loot'],
  ['chenillette', 'C', 'a caterpillar wearing a tracksuit with a different sneaker on each of its many feet, jogging on a leaf'],
  ['biscotto', 'C', 'a fat french bulldog puppy with a spiked collar trying to look tough but adorable, sitting on a doorstep'],
  ['herissnik', 'C', 'a hedgehog whose spikes are styled like a punk mohawk, riding a skateboard in a skatepark'],
  ['fourmidable', 'C', 'a tiny ant proudly carrying a huge shopping bag twenty times bigger than itself on a sidewalk'],
  ['bitumouche', 'C', 'a fly wearing big aviator goggles and a tiny jetpack, zooming low over the asphalt of a street'],
  ['crocodalle', 'R', 'a hungry crocodile in sunglasses and a flowery short-sleeve shirt, chomping a giant burger on a city riverbank'],
  ['betonnard', 'R', 'a sturdy little golem made of concrete blocks with rebar sticking out, wearing a tracksuit jacket, arms crossed, in a construction site'],
  ['tigresko', 'R', 'a tiger cub with a big gold chain flexing its muscles on the hood of a shiny car'],
  ['hiboss', 'R', 'a mysterious owl in a long coat perched on a rooftop edge, watching the city lights at night with glowing eyes'],
  ['requinoir', 'R', 'a shark in a sharp black suit and tie, slick grin, standing in a neon-lit harbor at night'],
  ['flamenkoh', 'R', 'a pink flamingo in sneakers striking a dance pose under a spotlight on a street dance floor'],
  ['gorilleur', 'R', 'a huge gorilla bouncer in a black t-shirt with an earpiece guarding a nightclub door, arms crossed, velvet rope'],
  ['scarabling', 'R', 'a golden scarab beetle covered in bling and jewels, shining, on a velvet cushion in a jewellery shop'],
  ['electrochat', 'R', 'a cat with crackling electric yellow fur and sparks flying, balancing on a power line over the city'],
  ['meduzik', 'R', 'a glowing neon jellyfish floating in the night sky, its tentacles shaped like music cables and musical notes'],
  ['pandagrillz', 'R', 'a panda with shiny gold teeth grills grinning widely while eating bamboo, in an urban bamboo garden'],
  ['fenekko', 'R', 'a fennec fox with huge ears and round sunglasses sitting on a dune at sunset, very cool'],
  ['phenix', 'E', 'a majestic phoenix rising from flames above tall housing project towers at night, wings spread wide'],
  ['kraken', 'E', 'a giant purple kraken grabbing container ships in a stormy harbor, lightning, epic scale'],
  ['liontours', 'E', 'a majestic lion wearing a crown sitting on top of a high-rise tower, king of the block, sunset sky'],
  ['licornette', 'E', 'a sassy unicorn with a neon pink mane on roller skates, gliding through a neon-lit street'],
  ['golemneon', 'E', 'a towering golem made of neon signs and glowing tubes walking down a dark city street, magical'],
  ['louperiph', 'E', 'a werewolf in a leather jacket howling on a highway bridge under a huge full moon'],
  ['serpentdor', 'E', 'a huge golden cobra coiled around a stack of gold bars, hypnotic glowing eyes, treasure vault'],
  ['yetiz', 'E', 'a big friendly yeti in an oversized puffer jacket and beanie riding a snowboard down a mountain at night'],
  ['parrain', 'L', 'an ancient giant tortoise mafia boss in a pinstripe suit and fedora, holding a golden cane, sitting on a throne in a dark lounge, wise and menacing'],
  ['kaiju', 'L', 'a colossal kaiju made of asphalt, street lamps and road signs rising over the city skyline, epic and terrifying'],
  ['esprit', 'L', 'a divine glowing golden fox spirit with nine tails made of light, floating among golden coins and sparkles above the city'],
  ['cosmo', 'L', 'a legendary cosmic dragon made of stars, nebulas and galaxies, coiling through outer space']
];
const lot = (name, list) => fs.writeFileSync(`${__dirname}/${name}.js`, head + 'HC.LOT = ' + JSON.stringify(list) + ';\n' + foot);
const L = C.map(([k, r, d]) => ['item-cr-' + k, '2:3', card(r, d), REF[r]]);
for (let i = 0; i < 4; i++) lot('lot-creatures-' + (i + 1), L.slice(i * 10, i * 10 + 10));
// boutique
const ICON = 'Single isolated game icon, centered, on a plain pure white background, nothing else.';
const ingot = (n, d) => ['shop-lingot-' + n, '1:1', S + `Game shop item: ${d}, shiny polished gold bars (ingots) with sparkles. Same gold bar style as the reference icon. ${ICON}` + NO, RAW + 'icon-lingot.png'];
lot('lot-boutique', [
  ingot(1, 'a small handful of three gold bars'),
  ingot(2, 'a small leather pouch spilling a few gold bars'),
  ingot(3, 'a canvas money sack overflowing with gold bars'),
  ingot(4, 'an open wooden treasure chest full of gold bars'),
  ingot(5, 'a small delivery truck loaded with a mountain of gold bars'),
  ingot(6, 'a huge bank vault door open on a room piled high with gold bars'),
  ['pack-start', '1:1', S + 'Starter pack bundle for a mobile game shop: a cool backpack bursting open with gold bars, a stack of plain green banknotes, three trading card booster packs and a small glowing mining rig. Festive and generous. ' + ICON + NO],
  ['pack-noads', '1:1', S + 'No-ads pack icon for a mobile game shop: a retro TV screen with a big red prohibition circle over it, a happy face peeking out, a few gold bars around. ' + ICON + NO],
  ['pack-pass', '1:1', S + 'Season pass icon for a mobile game shop: a shiny golden VIP pass card on a lanyard with a calendar and a little pile of gold bars and a booster pack. ' + ICON + NO],
  ['pack-collec', '1:1', S + 'Collector pack icon for a mobile game shop: a tall fan of colourful trading card booster packs and a few loose shiny cards, sparkles. ' + ICON + NO, RAW + 'booster-pack.png']
]);
lot('lot-boutique-b', [
  ['pack-magnat', '1:1', S + 'Ultimate tycoon pack icon for a mobile game shop: a golden crown sitting on top of a pile of gold bars, banknote stacks, booster packs and a gold tracksuit jacket, dazzling. ' + ICON + NO],
  ['ic-shop-ville', '1:1', S + 'Game shop icon for city decorations: a tiny cute street corner diorama with a graffiti bench, a retro street lamp and a potted palm tree, three-quarter view, same size and angle as the reference icon. ' + ICON + NO, RAW + 'ic-promo.png'],
  ['pop-starter', '3:4', S + 'Promotional illustration for a mobile game starter offer: a cheerful young street hustler in a tracksuit opening a glowing backpack bursting with gold bars, plain green banknotes, trading card booster packs and sparkles, dynamic pose, exciting, on a soft radial purple and gold burst background. No text, no letters, no numbers, no words, no logos, no brands, no dollar sign.', RAW + 'skin-survet.png'],
  ['shop-hero', '16:9', S + 'Wide banner background for a mobile game shop: a luxurious street boutique interior at night with gold bars on shelves, stacks of plain green banknotes, booster packs, neon signs without text, warm golden light, depth, room on the left for overlay text. No text, no letters, no numbers, no words, no logos, no brands, no dollar sign.'],
  ['card-back-crea', '2:3', S + 'The back side of a fantasy creature trading card seen perfectly straight from the front, flat, upright rectangle with rounded corners, symmetrical design in deep purple and gold with a subtle graffiti pattern, a round central emblem showing a stylised dragon eye with a little crown. Same card design language as the reference card. Single card centered on a plain pure white background.' + NO, RAW + 'item-c-dragon.png'],
  ['art-c-signed', '4:3', S + 'A football star in action signing a ball with a marker for a crowd of excited fans after a match in a street stadium at night, floodlights, confetti. Trading card illustration (the picture window of a sports trading card), full-bleed scene that fills the whole image edge to edge, no card frame, no border, no name box. Same art style as the reference image. No text, no letters, no numbers, no words, no logos, no brands.', RAW + 'art-k-f1.png']
]);
console.log('ok');
