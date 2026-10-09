// Level names and ordering: https://www.speedrun.com/yi/levels (October 7, 2026).
// Eight main stages and one extra stage in each of six worlds.
const levelNames = [
  ['Make Eggs, Throw Eggs', 'Watch Out Below!', 'The Cave Of Chomp Rock', "Burt The Bashful's Fort", 'Hop! Hop! Donut Lifts', 'Shy-Guys On Stilts', 'Touch Fuzzy, Get Dizzy', "Salvo The Slime's Castle", "Poochy Ain't Stupid"],
  ['Visit Koopa And Para-Koopa', 'The Baseball Boys', "What's Gusty Taste Like?", "Bigger Boo's Fort", 'Watch Out For Lakitu', 'The Cave Of The Mystery Maze', "Lakitu's Wall", "The Potted Ghost's Castle", 'Hit That Switch!!'],
  ['Welcome To Monkey World!', 'Jungle Rhythm . . .', "Nep-Enuts' Domain", "Prince Froggy's Fort", "Jammin' Through The Trees", 'The Cave Of Harry Hedgehog', "Monkeys' Favorite Lake", "Naval Piranha's Castle", 'More Monkey Madness'],
  ['GO! GO! MARIO! !', 'The Cave Of The Lakitus', "Don't Look Back!", "Marching Milde's Fort", 'Chomp Rock Zone', 'Lake Shore Paradise', 'Ride Like The Wind', "Hookbill The Koopa's Castle", 'The Impossible? Maze'],
  ['BLIZZARD! ! !', 'Ride The Ski Lifts', 'Danger - Icy Conditions Ahead', "Sluggy The Unshaven's Fort", 'Goonie Rides!', 'Welcome To Cloud World', 'Shifting Platforms Ahead', "Raphael The Raven's Castle", "Kamek's Revenge"],
  ['Scary Skeleton Goonies!', 'The Cave Of The Bandits', 'Beware The Spinning Logs', "Tap-Tap The Red Nose's Fort", 'The Very Loooooong Cave', 'The Deep, Underground Maze', 'KEEP MOVING! ! ! !', "King Bowser's Castle", 'Castles - Masterpiece Set'],
];
const levels = levelNames.flatMap((names, index) => names.map((name, stage) => ({
  slug: `${index + 1}-${stage === 8 ? 'E' : stage + 1}`,
  world: index + 1, name,
})));
const levelCategories = [{slug:'any',name:'Any%'},{slug:'100',name:'100%'}];
const levelBoards = levels.flatMap(level => levelCategories.map(category => ({
  slug:`il-${level.slug}-${category.slug}`, level:level.slug, world:level.world,
  mode:category.slug, label:category.name,
  name:`${level.slug}: ${level.name} · ${category.name}`,
})));
