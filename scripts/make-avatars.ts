/**
 * Draws the profile pictures (src/lib/avatars.ts) as Open Peeps characters
 * into src/assets/avatars/<id>.svg, through DiceBear's open-peeps style, each
 * with a small raster copy, <id>-thumb.webp, for the picker grid; and writes
 * src/components/app/avatar-assets.ts, which lists them all.
 * Re-run after changing a picture below:  npx tsx scripts/make-avatars.ts
 *
 * Open Peeps is by Pablo Stanley (https://www.openpeeps.com), CC0 1.0; each
 * SVG carries that in its metadata. Every option is set, nothing is random,
 * so the same table always draws the same pictures.
 */
import { writeFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { createAvatar } from "@dicebear/core";
import * as openPeeps from "@dicebear/open-peeps";
import { AVATARS, type AvatarId } from "../src/lib/avatars";

const OUT = join(__dirname, "../src/assets/avatars");
const ASSETS_TS = join(__dirname, "../src/components/app/avatar-assets.ts");

/**
 * The grid shows pictures 56 px wide: thumbnails at 3x that, so they're sharp
 * on dense screens. Raster, because 45 SVGs drawn from their paths in one frame
 * is a visible stall on a phone; a small bitmap is just copied to the screen.
 */
const THUMB = 168;

// Skin tones (the five Open Peeps ones), hair, and the app's warm palette.
const SKIN = { light: "ffdbb4", fair: "edb98a", tan: "d08b5b", brown: "ae5d29", deep: "694d3d" };
const HAIR = { black: "2c1b18", brown: "724133", auburn: "a55728", blonde: "d6b370", grey: "e8e1e1" };
const WEAR = {
  coral: "d88060", olive: "7d8c4a", teal: "4f7a72", slate: "5a7a8c", ochre: "c9942f", plum: "a4566e",
  brick: "b84b3a", ink: "3a3a36", cream: "efe6d6", violet: "6d5b8c",
};
const BG = {
  peach: "ecc0a8", sage: "c9dcc0", stone: "e8e2d8", butter: "f7dda0", rose: "e8b8a8", lavender: "d6d0e6",
  blush: "f6d8d0", cream: "f3e6d4", sky: "d6dbe8", mint: "dfe8d6", sand: "f0e2c8", lilac: "e2d6e6",
};

interface Peep {
  head: string;
  face: string;
  skin: keyof typeof SKIN;
  hair: keyof typeof HAIR;
  wear: keyof typeof WEAR;
  bg: keyof typeof BG;
  accessory?: string;
  facialHair?: string;
}

const PEEPS: Record<AvatarId, Peep> = {
  "peep-01": { head: "short4", face: "smile", skin: "fair", hair: "black", wear: "coral", bg: "peach" },
  "peep-02": { head: "long", face: "smile", skin: "tan", hair: "black", wear: "olive", bg: "sage" },
  "peep-03": { head: "short2", face: "calm", skin: "light", hair: "brown", wear: "cream", bg: "stone", accessory: "glasses" },
  "peep-04": { head: "bun", face: "cute", skin: "brown", hair: "black", wear: "coral", bg: "butter" },
  "peep-05": { head: "longCurly", face: "cheeky", skin: "fair", hair: "black", wear: "plum", bg: "rose" },
  "peep-06": { head: "hatHip", face: "smile", skin: "light", hair: "brown", wear: "ink", bg: "sky" },
  "peep-07": { head: "mediumStraight", face: "lovingGrin1", skin: "tan", hair: "black", wear: "cream", bg: "lavender" },
  "peep-08": { head: "afro", face: "calm", skin: "deep", hair: "black", wear: "teal", bg: "sage" },
  "peep-09": { head: "mediumBangs", face: "cute", skin: "fair", hair: "black", wear: "ochre", bg: "blush" },
  "peep-10": { head: "pomp", face: "smile", skin: "light", hair: "auburn", wear: "slate", bg: "cream", facialHair: "moustache2" },
  "peep-11": { head: "hatBeanie", face: "cute", skin: "brown", hair: "black", wear: "olive", bg: "sand" },
  "peep-12": { head: "hijab", face: "calm", skin: "tan", hair: "black", wear: "violet", bg: "lilac" },
  "peep-13": { head: "dreads1", face: "smile", skin: "deep", hair: "black", wear: "coral", bg: "blush" },
  "peep-14": { head: "medium3", face: "smile", skin: "light", hair: "brown", wear: "olive", bg: "mint", accessory: "glasses2" },
  "peep-15": { head: "shaved2", face: "cheeky", skin: "brown", hair: "black", wear: "ink", bg: "sky", facialHair: "full" },
  "peep-16": { head: "turban", face: "smile", skin: "tan", hair: "black", wear: "cream", bg: "butter", facialHair: "full2" },
  "peep-17": { head: "bangs2", face: "calm", skin: "light", hair: "black", wear: "brick", bg: "peach" },
  "peep-18": { head: "longAfro", face: "cheeky", skin: "brown", hair: "black", wear: "ochre", bg: "cream" },
  "peep-19": { head: "short1", face: "calm", skin: "fair", hair: "black", wear: "teal", bg: "sky", accessory: "glasses3" },
  "peep-20": { head: "cornrows", face: "smile", skin: "deep", hair: "black", wear: "plum", bg: "blush" },
  "peep-21": { head: "medium2", face: "cute", skin: "tan", hair: "black", wear: "slate", bg: "sage" },
  "peep-22": { head: "noHair2", face: "calm", skin: "light", hair: "grey", wear: "cream", bg: "cream", accessory: "glasses4", facialHair: "moustache4" },
  "peep-23": { head: "twists", face: "smile", skin: "brown", hair: "black", wear: "olive", bg: "butter" },
  "peep-24": { head: "longBangs", face: "lovingGrin1", skin: "fair", hair: "brown", wear: "coral", bg: "rose" },
  "peep-25": { head: "flatTop", face: "cheeky", skin: "deep", hair: "black", wear: "ochre", bg: "mint" },
  "peep-26": { head: "bun2", face: "calm", skin: "light", hair: "auburn", wear: "teal", bg: "blush" },
  "peep-27": { head: "shaved1", face: "smile", skin: "tan", hair: "black", wear: "slate", bg: "stone", facialHair: "goatee1" },
  "peep-28": { head: "mediumBangs3", face: "smile", skin: "brown", hair: "black", wear: "coral", bg: "lavender" },
  "peep-29": { head: "short5", face: "smile", skin: "fair", hair: "black", wear: "ink", bg: "sand", accessory: "sunglasses" },
  "peep-30": { head: "bantuKnots", face: "cute", skin: "deep", hair: "black", wear: "coral", bg: "butter" },
  "peep-31": { head: "medium1", face: "cute", skin: "light", hair: "blonde", wear: "olive", bg: "sky" },
  "peep-32": { head: "short3", face: "cute", skin: "tan", hair: "black", wear: "plum", bg: "sage", facialHair: "full3" },
  "peep-33": { head: "buns", face: "smile", skin: "fair", hair: "black", wear: "teal", bg: "peach" },
  "peep-34": { head: "mediumBangs2", face: "cheeky", skin: "brown", hair: "brown", wear: "ochre", bg: "lilac" },
  "peep-35": { head: "dreads2", face: "smile", skin: "deep", hair: "black", wear: "violet", bg: "cream", accessory: "glasses5" },
  // Children: the small heads with the "cute" face.
  "peep-36": { head: "mohawk2", face: "cute", skin: "deep", hair: "black", wear: "coral", bg: "butter" },
  "peep-37": { head: "mohawk", face: "cute", skin: "light", hair: "brown", wear: "teal", bg: "sky" },
  "peep-38": { head: "twists2", face: "cute", skin: "tan", hair: "black", wear: "olive", bg: "mint" },
  "peep-39": { head: "buns", face: "cute", skin: "brown", hair: "black", wear: "plum", bg: "blush" },
  // Older people: the "old" face, with its lines, and mostly grey hair. No beards:
  // facial hair is always drawn black, which reads younger.
  "peep-40": { head: "grayBun", face: "old", skin: "fair", hair: "grey", wear: "plum", bg: "rose", accessory: "glasses" },
  "peep-41": { head: "grayMedium", face: "old", skin: "brown", hair: "grey", wear: "teal", bg: "sage" },
  "peep-42": { head: "grayShort", face: "old", skin: "deep", hair: "grey", wear: "ochre", bg: "cream" },
  "peep-43": { head: "noHair1", face: "old", skin: "light", hair: "grey", wear: "slate", bg: "stone", accessory: "glasses4" },
  "peep-44": { head: "hijab", face: "old", skin: "tan", hair: "black", wear: "violet", bg: "lilac" },
  "peep-45": { head: "turban", face: "old", skin: "tan", hair: "grey", wear: "cream", bg: "butter" },
};

function draw(p: Peep): string {
  // The style's option types are string unions; the table above uses its names.
  const options = {
    head: [p.head],
    face: [p.face],
    skinColor: [SKIN[p.skin]],
    headContrastColor: [HAIR[p.hair]],
    clothingColor: [WEAR[p.wear]],
    backgroundColor: [BG[p.bg]],
    accessories: p.accessory ? [p.accessory] : [],
    accessoriesProbability: p.accessory ? 100 : 0,
    facialHair: p.facialHair ? [p.facialHair] : [],
    facialHairProbability: p.facialHair ? 100 : 0,
    maskProbability: 0,
    // Head and shoulders inside the circle the app crops pictures to.
    scale: 80,
    translateY: 6,
  } as Parameters<typeof createAvatar<typeof openPeeps>>[1];
  return slim(createAvatar(openPeeps, options).toString());
}

/**
 * Lighter to draw, the same picture: DiceBear wraps everything in a mask that
 * crops nothing (a full-size square; the viewBox crops anyway), and a mask makes
 * the WebView draw each picture off-screen first, which 45 of them on one page
 * make you feel. Its licence metadata becomes a one-line comment.
 */
function slim(svg: string): string {
  const out = svg
    .replace(/<metadata[\s\S]*?<\/metadata>/, "<!-- Open Peeps by Pablo Stanley (openpeeps.com), CC0 1.0 -->")
    .replace(/<mask id="viewboxMask">[\s\S]*?<\/mask><g mask="url\(#viewboxMask\)">/, "<g>");
  if (out.includes("mask") || out.includes("<metadata")) throw new Error("make-avatars: DiceBear's SVG wrapper changed; update slim()");
  return out;
}

async function main() {
  for (const file of readdirSync(OUT)) rmSync(join(OUT, file));
  for (const { id } of AVATARS) {
    const svg = draw(PEEPS[id]);
    writeFileSync(join(OUT, `${id}.svg`), svg);
    await sharp(Buffer.from(svg)).resize(THUMB, THUMB).webp({ quality: 90 }).toFile(join(OUT, `${id}-thumb.webp`));
  }

  const name = (id: string) => id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
  writeFileSync(
    ASSETS_TS,
    [
      "// Generated by scripts/make-avatars.ts. Do not edit.",
      'import type { StaticImageData } from "next/image";',
      'import type { AvatarId } from "@/lib/avatars";',
      ...AVATARS.flatMap(({ id }) => [
        `import ${name(id)} from "@/assets/avatars/${id}.svg";`,
        `import ${name(id)}Thumb from "@/assets/avatars/${id}-thumb.webp";`,
      ]),
      "",
      "/** Each profile picture's image (see src/lib/avatars.ts). */",
      "export const AVATAR_IMAGES: Record<AvatarId, StaticImageData> = {",
      ...AVATARS.map(({ id }) => `  "${id}": ${name(id)},`),
      "};",
      "",
      `/** A ${THUMB} px raster copy of each, for the picker grid (quick to draw many at once). */`,
      "export const AVATAR_THUMBS: Record<AvatarId, StaticImageData> = {",
      ...AVATARS.map(({ id }) => `  "${id}": ${name(id)}Thumb,`),
      "};",
      "",
    ].join("\n"),
  );
  console.log(`make-avatars: drew ${AVATARS.length} pictures and thumbnails into src/assets/avatars`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
