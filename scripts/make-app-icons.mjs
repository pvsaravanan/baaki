/**
 * Draws every place the baaki logo appears as a picture, from one source image,
 * src/assets/baaki_logo.png (the logo on a transparent background, cropped to
 * its edges):
 *   - the in-app logo (src/assets/baaki_logo_app.png)
 *   - the website icons (src/app/icon.png, apple-icon.png, favicon.ico)
 *   - the Android launcher icons (every density, square and round, plus the
 *     adaptive-icon foreground)
 *   - the splash screens of Android 11 and older
 *   - the iOS app icon, and the iOS copies of the launch pictures (the resting
 *     logo and the launch video's last frames, from the Android resources)
 * Re-run after changing the logo:  node scripts/make-app-icons.mjs
 *
 * Not drawn here: the launch animation of newer Android versions (the
 * animated logo in res/drawable/launch_logo*.xml and the video
 * res/raw/splash.mp4, rendered from baaki-splash/).
 */
import { readdirSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = new URL("..", import.meta.url).pathname;
const res = join(root, "android/app/src/main/res");
const LOGO = join(root, "src/assets/baaki_logo.png");
const PARCHMENT = "#f4f1ea";
// Behind the splash logo. The app draws a copy of the splash to see it out
// smoothly: change SPLASH_BACKGROUND in src/components/app/splash-handoff.tsx
// with it (its test checks they agree).
const SPLASH_BACKGROUND = "#f8f2e9";

const logoMeta = await sharp(LOGO).metadata();
const ASPECT = logoMeta.width / logoMeta.height;

/** The logo scaled to fit a box (width x height), as a PNG buffer. */
const fit = (boxW, boxH) =>
  sharp(LOGO)
    .resize({ width: Math.round(boxW), height: Math.round(boxH), fit: "inside", kernel: "lanczos3" })
    .png()
    .toBuffer();

/** The logo centred on a canvas, filling `share` of the shorter side. */
async function logoOn(width, height, share, colour) {
  const box = Math.min(width, height) * share;
  const input = await fit(box, box);
  const canvas = sharp({
    create: { width, height, channels: 4, background: colour ?? { r: 0, g: 0, b: 0, alpha: 0 } },
  });
  return canvas.composite([{ input }]).png();
}

const write = async (file, image) => writeFileSync(file, await image.toBuffer());

// The in-app logo: small, with a limited palette, as it is only ever drawn tiny.
await sharp(LOGO)
  .resize({ height: 288, kernel: "lanczos3" })
  .png({ palette: true, quality: 90, compressionLevel: 9 })
  .toFile(join(root, "src/assets/baaki_logo_app.png"));

// Website icons.
await write(join(root, "src/app/icon.png"), await logoOn(512, 512, 0.9));
await write(join(root, "src/app/apple-icon.png"), await logoOn(180, 180, 0.7, PARCHMENT));
{
  // favicon.ico: PNG images in an ICO container (16, 32, 48).
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map(async (s) => (await logoOn(s, s, 0.94)).toBuffer()));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(s, e); // width
    header.writeUInt8(s, e + 1); // height
    header.writeUInt8(0, e + 2); // palette
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4); // colour planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(images[i].length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += images[i].length;
  });
  writeFileSync(join(root, "src/app/favicon.ico"), Buffer.concat([header, ...images]));
}

// Android launcher icons, per density: legacy square + round (the logo at ~66%
// on parchment) and the adaptive-icon foreground (108dp canvas; the logo kept
// inside the 66dp safe zone so any mask shape shows all of it).
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [density, k] of Object.entries(DENSITIES)) {
  const dir = join(res, `mipmap-${density}`);
  const size = Math.round(48 * k);
  const mark = await fit(size * 0.66, size * 0.66);
  const square = sharp({ create: { width: size, height: size, channels: 4, background: PARCHMENT } });
  await write(join(dir, "ic_launcher.png"), square.composite([{ input: mark }]).png());
  const circle = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);
  const round = sharp({ create: { width: size, height: size, channels: 4, background: PARCHMENT } });
  await write(
    join(dir, "ic_launcher_round.png"),
    round.composite([{ input: mark }, { input: circle, blend: "dest-in" }]).png(),
  );
  const fg = Math.round(108 * k);
  await write(join(dir, "ic_launcher_foreground.png"), await logoOn(fg, fg, 0.52));
}
for (const name of ["ic_launcher", "ic_launcher_round"]) {
  writeFileSync(
    join(res, `mipmap-anydpi-v26/${name}.xml`),
    `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`,
  );
}

writeFileSync(
  join(res, "values/ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${PARCHMENT.toUpperCase()}</color>\n</resources>\n`,
);
writeFileSync(
  join(res, "values/splash_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by scripts/make-app-icons.mjs. Do not edit. -->\n<resources>\n    <color name="splash_background">${SPLASH_BACKGROUND.toUpperCase()}</color>\n</resources>\n`,
);

// Splash screens (Android 11 and older): the logo centred on the splash
// background, at every size Capacitor's template ships.
const splashDirs = readdirSync(res).filter((d) => d.startsWith("drawable") && existsSync(join(res, d, "splash.png")));
for (const d of splashDirs) {
  const file = join(res, d, "splash.png");
  const { width, height } = await sharp(file).metadata();
  const side = Math.round(Math.min(width, height) * 0.36);
  const mark = await fit(side, side / Math.min(1, ASPECT));
  const canvas = sharp({ create: { width, height, channels: 4, background: SPLASH_BACKGROUND } });
  const { width: mw, height: mh } = await sharp(mark).metadata();
  writeFileSync(
    file,
    await canvas
      .composite([{ input: mark, left: Math.round((width - mw) / 2), top: Math.round((height - mh) / 2) }])
      .png()
      .toBuffer(),
  );
}
// iOS (ios/App/App/Assets.xcassets): the app icon, one 1024px square that iOS
// masks and scales (the logo at ~66% on parchment, like Android's; no
// transparency, which the App Store refuses), and the launch animation's
// pictures, as PNG (asset catalogs don't take WebP).
const assets = join(root, "ios/App/App/Assets.xcassets");
if (existsSync(assets)) {
  const imageset = (name, file, image) => {
    const dir = join(assets, `${name}.imageset`);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir);
    writeFileSync(
      join(dir, "Contents.json"),
      JSON.stringify({ images: [{ filename: file, idiom: "universal" }], info: { author: "xcode", version: 1 } }, null, 2) + "\n",
    );
    return image.png({ compressionLevel: 9 }).toFile(join(dir, file));
  };
  const icon = sharp({ create: { width: 1024, height: 1024, channels: 3, background: PARCHMENT } });
  await write(
    join(assets, "AppIcon.appiconset/AppIcon-512@2x.png"),
    icon.composite([{ input: await fit(1024 * 0.66, 1024 * 0.66) }]).flatten({ background: PARCHMENT }).removeAlpha().png(),
  );
  rmSync(join(assets, "Splash.imageset"), { recursive: true, force: true });
  const drawables = join(res, "drawable-nodpi");
  // The resting logo, at its 288pt launch-screen canvas (LaunchCover.logoCanvas),
  // which it's never drawn larger than. Sized to the screen's scale rather than
  // one large picture: the launch screen leaves out an image that big.
  {
    const dir = join(assets, "LaunchLogo.imageset");
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir);
    const scales = [2, 3];
    writeFileSync(
      join(dir, "Contents.json"),
      JSON.stringify(
        {
          images: scales.map((k) => ({ filename: `launch_logo@${k}x.png`, idiom: "universal", scale: `${k}x` })),
          info: { author: "xcode", version: 1 },
        },
        null,
        2,
      ) + "\n",
    );
    for (const k of scales) {
      await sharp(join(drawables, "launch_logo.png"))
        .resize({ width: 288 * k, kernel: "lanczos3" })
        .png({ compressionLevel: 9 })
        .toFile(join(dir, `launch_logo@${k}x.png`));
    }
  }
  await imageset("SplashLastFrame", "splash_last_frame.png", sharp(join(drawables, "splash_last_frame.webp")));
  await imageset("SplashLastFrameWordmark", "splash_last_frame_wordmark.png", sharp(join(drawables, "splash_last_frame_wordmark.webp")));
}

console.log(`make-app-icons: ${Object.keys(DENSITIES).length} icon densities, ${splashDirs.length} splash screens`);
