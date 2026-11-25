import { sprite } from "./pixel";

/* Original pixel sprites, drawn on a 12x12 (icons) or 16-wide grid. */

export const WATER = sprite([
  ".....kk.....",
  "....kllk....",
  "....kllk....",
  "...kllllk...",
  "..kllllllk..",
  ".klwllllllk.",
  ".klwllllllk.",
  ".kllwlllllk.",
  ".kllllllllk.",
  "..kllllllk..",
  "...kkkkkk...",
  "............",
]);

export const FOOD = sprite([
  "............",
  "...kkkk..kk.",
  "..krrrrk.krk",
  ".krwkrrrkrrk",
  ".krrrrrrrrk.",
  "..krrrrk.krk",
  "...kkkk..kk.",
  "........g...",
  ".......kkk..",
  "......kyyyk.",
  "......kyoyk.",
  ".......kkk..",
]);

export const WOOD = sprite([
  "............",
  "............",
  "............",
  ".kkkkkkkkkk.",
  "knnnnnnnnkSk",
  "knNNNNnnnksk",
  "knnnnnnnnksk",
  "knnnnNNNnkSk",
  ".kkkkkkkkkk.",
  "............",
  "............",
  "............",
], { S: "#c99a5b" });

export const STONE = sprite([
  "............",
  "............",
  "............",
  "....kkkk....",
  "..kkeeeekk..",
  ".keeweeeeek.",
  ".keweeeeEek.",
  "keeeeeeeEEek",
  "keeeeeeEEEek",
  ".kEEEEEEEEk.",
  "..kkkkkkkk..",
  "............",
]);

export const SHELTER = sprite([
  ".....kk.....",
  "....kggk....",
  "...kggggk...",
  "..kgGggGgk..",
  ".kggggggggk.",
  "kGgggGgggGgk",
  "kkkkkkkkkkkk",
  ".knnnnnnnnk.",
  ".knnkkkknnk.",
  ".knnkNNknnk.",
  ".knnkNNknnk.",
  ".kkkkkkkkkk.",
]);

export const FIRE = sprite([
  ".....kk.....",
  "....krrk....",
  "...krrrrk...",
  "..krrorrrk..",
  "..krooorrk..",
  ".krrooyorrk.",
  ".kroyyyyork.",
  "..kroyyork..",
  "...kkkkkk...",
  "kNnnnnnnnnNk",
  "kkNnnnnnnNkk",
  ".kkkkkkkkkk.",
]);

export const WATER_STORE = sprite([
  "............",
  "...kkkkkk...",
  "...ksssskk..",
  "....kRRk....",
  "..kkRRRRkk..",
  ".kRRRllRRRk.",
  "kRRRllllRRRk",
  "kRRRllllRRRk",
  "kRRRRllRRRRk",
  ".kRRRRRRRRk.",
  "..kkkkkkkk..",
  "............",
]);

export const WATCHTOWER = sprite([
  ".....kk.....",
  "....krrk....",
  "...krrrrk...",
  "..krrrrrrk..",
  ".kkkkkkkkkk.",
  "..kyyyyyyk..",
  ".kkkkkkkkkk.",
  "...n....n...",
  "...nn..nn...",
  "....nnnn....",
  "...nn..nn...",
  "..nn....nn..",
]);

const RAFT_BASE = ["kkkkkkkkkkkk", "knnNnnNnnNnk", "kkkkkkkkkkkk", "tbbtbbtbbtbb"];
const MAST = ".....k......";
export const RAFT = [
  sprite([...Array(8).fill("............"), ...RAFT_BASE]),
  sprite(["............", ...Array(7).fill(MAST), ...RAFT_BASE]),
  sprite([
    ".....krr....",
    ".....kk.....",
    ".....kwk....",
    ".....kwwk...",
    ".....kwwwk..",
    ".....kwwwwk.",
    ".....kkkkkk.",
    MAST,
    ...RAFT_BASE,
  ]),
] as const;

export const HAZARD = sprite([
  ".....kk.....",
  "....kyyk....",
  "...kykkyk...",
  "...kykkyk...",
  "..kyykkyyk..",
  "..kyykkyyk..",
  ".kyyykkyyyk.",
  ".kyyyyyyyyk.",
  "kyyyykkyyyyk",
  "kyyyyyyyyyyk",
  "kkkkkkkkkkkk",
  "............",
]);

export const RAIDER = sprite([
  ".....k......",
  ".....kRR....",
  ".....krrRR..",
  ".....krrrR..",
  ".....krrRR..",
  ".....krR....",
  ".....k......",
  "kkkkkkkkkkkk",
  "kNNyNNyNNyNk",
  ".kNNNNNNNNk.",
  "..kkkkkkkk..",
  "bb.bb.bb.bb.",
]);

export const STORM = sprite([
  "............",
  "....kkkk....",
  "..kkeeeekk..",
  ".keeeeeeeek.",
  "keeeEeeeeEek",
  "kEEEEEEEEEEk",
  ".kkkkykkkkk.",
  "..l..yy.l...",
  ".l..yy..l...",
  "....y.......",
  "...y........",
  "............",
]);

export const CROWN = sprite([
  "............",
  "............",
  ".k...kk...k.",
  "kyk.kyyk.kyk",
  "kyykyyyykyyk",
  "kyyyyrryyyyk",
  "kyyyyrryyyyk",
  "kyyyyyyyyyyk",
  "kkkkkkkkkkkk",
  "kooooooooook",
  "kkkkkkkkkkkk",
  "............",
]);

export const TIMER = sprite([
  "....kkkk....",
  ".....kk.....",
  "...kkkkkk...",
  "..kwwwwwwk..",
  ".kwwwkwwwwk.",
  ".kwwwkwwwwk.",
  ".kwwwkRRRwk.",
  ".kwwwwwwwwk.",
  ".kwwwwwwwwk.",
  "..kwwwwwwk..",
  "...kkkkkk...",
  "............",
]);

const MEDAL_ROWS = [
  ".tt......tt.",
  "..tt....tt..",
  "...tt..tt...",
  "....kkkk....",
  "..kkCCCCkk..",
  ".kCCCCCCCCk.",
  ".kCCCCCCCCk.",
  "kCCCCCCCCCCk",
  "kCCCCCCCCCCk",
  "kCCCCCCCCCCk",
  ".kCCCCCCCCk.",
  ".kCCCCCCCCk.",
  "..kkCCCCkk..",
  "....kkkk....",
];
export const MEDALS = {
  1: sprite(MEDAL_ROWS, { C: "#ffd23f" }),
  2: sprite(MEDAL_ROWS, { C: "#d5dde8" }),
  3: sprite(MEDAL_ROWS, { C: "#d58a4a" }),
} as const;
/** 3x5 digits drawn over the medal. */
export const DIGITS = {
  1: sprite([".k.", "kk.", ".k.", ".k.", "kkk"]),
  2: sprite(["kk.", "..k", ".k.", "k..", "kkk"]),
  3: sprite(["kk.", "..k", ".k.", "..k", "kk."]),
} as const;

export const TROPHY = sprite([
  "..kkkkkkkk..",
  "kkkywyyyykkk",
  "k.kywyyyyk.k",
  "k.kyyyyyyk.k",
  ".kkyyyyyykk.",
  "...kyyyyk...",
  "....kyyk....",
  "....kook....",
  "....kook....",
  "...kkkkkk...",
  "..knnnnnnk..",
  "..kkkkkkkk..",
]);

export const STAR = sprite([
  ".....kk.....",
  "....kyyk....",
  "....kyyk....",
  "kkkkkyykkkkk",
  "kyyyyyyyyyyk",
  ".kyyyywyyyk.",
  "..kyyyyyyk..",
  "..kyyyyyyk..",
  ".kyyykkyyyk.",
  ".kyyk..kyyk.",
  "kyyk....kyyk",
  "kkk......kkk",
]);

export const PALM = sprite([
  "...ggg....ggg...",
  ".ggGGgg..ggGGgg.",
  "gG...ggggg...Gg.",
  "g...gGgNNgGg...g",
  "...gG..NN..Gg...",
  "..gG...nn...Gg..",
  ".......nn.......",
  "......nn........",
  "......nN........",
  "......nn........",
  ".....nN.........",
  ".....nn.........",
  ".....nN.........",
  ".....nn.........",
  "...ssssssss.....",
  "..ssssssssss....",
]);

export const SUN = sprite([
  ".....yy.....",
  ".y...yy...y.",
  "..y......y..",
  "....oooo....",
  "...oyyyyo...",
  "yy.oyywyo.yy",
  "yy.oyyyyo.yy",
  "...oyyyyo...",
  "....oooo....",
  "..y......y..",
  ".y...yy...y.",
  ".....yy.....",
]);

export const WAVE_TILE = sprite([
  "................",
  "....wwww........",
  "..wwttttww......",
  "wwttttttttwwwwww",
  "tttttttttttttttt",
  "bbbbbbbbbbbbbbbb",
]);

export const SHELL = sprite([
  "............",
  "............",
  "...kkkkkk...",
  "..krqrqrqk..",
  ".krqrqrqrqk.",
  ".krqrqrqrqk.",
  ".krqrqrqrqk.",
  "..krqrqrqk..",
  "...krqrqk...",
  "....kkkk....",
  "...kqqqqk...",
  "...kkkkkk...",
]);

export const CRAB = sprite([
  "kk............kk",
  "rrk..........krr",
  "krk..........krk",
  ".krk..w..w..krk.",
  "..kk..k..k..kk..",
  "...krrrrrrrrk...",
  "..krrrrrrrrrrk..",
  ".krrrrrrrrrrrrk.",
  ".krrrrRRRRrrrrk.",
  "..kkkkkkkkkkkk..",
  ".k.k.k....k.k.k.",
  "k.k.k......k.k.k",
]);

export const PARROT = sprite([
  "....kkkk....",
  "...krrrrk...",
  "..krrwkrrk..",
  "..krrrrrkyk.",
  "..krrrrrkyyk",
  "..kggrrrk...",
  ".kgggggk....",
  ".kgGggggk...",
  ".kgGgyygk...",
  ".kgGgyygk...",
  ".kgGggggk...",
  "..kgGgggk...",
  "..kbbbbk....",
  "...kbbk.....",
  "nnnnnnnnnnnn",
  "...kbk......",
]);

/** Original round spiky fish. */
export const PUFFER = sprite([
  "....k..k....",
  ".k..kkkk..k.",
  "..kkyyyykk..",
  ".kyyyyyyyyk.",
  "kyywkyyyyyyk",
  "kyyyyyyyyykk",
  "kyyyyyyyyyok",
  "kssssssssskk",
  ".ksssssssk..",
  "..kkssskk...",
  ".k..kkk..k..",
  "............",
]);

export const CLOUD = sprite([
  ".....wwww.......",
  "...wwwwwwww.....",
  ".wwwwwwwwwwwww..",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  ".llllllllllllll.",
]);

export const XMARK = sprite([
  "RR....RR",
  "RRR..RRR",
  ".RRRRRR.",
  "..RRRR..",
  "..RRRR..",
  ".RRRRRR.",
  "RRR..RRR",
  "RR....RR",
]);

export const COMPASS = sprite([
  "....kk....",
  "...krrk...",
  "..kkrrkk..",
  ".kssrrssk.",
  "knnnkknnnk",
  "knnnkknnnk",
  ".ksseesk..",
  "..kkeekk..",
  "...keek...",
  "....kk....",
]);
