import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AVATARS, AVATAR_IDS, DEFAULT_AVATAR, avatarUrlFor, readAvatar } from "./avatars";

describe("profile pictures", () => {
  it("each have a unique id, a label and an image", () => {
    expect(new Set(AVATAR_IDS).size).toBe(AVATARS.length);
    // Labels are what screen readers announce for each choice: no two alike.
    expect(new Set(AVATARS.map((a) => a.label)).size).toBe(AVATARS.length);
    for (const a of AVATARS) {
      expect(a.label.trim(), a.id).not.toBe("");
      expect(existsSync(join(__dirname, "../assets/avatars", `${a.id}.png`)), `${a.id}.png`).toBe(true);
    }
    expect(AVATAR_IDS).toContain(DEFAULT_AVATAR);
  });

  it("are stored and read back as a picture", () => {
    expect(avatarUrlFor("cat")).toBe("avatar:cat");
    expect(readAvatar("avatar:cat")).toEqual({ kind: "picture", id: "cat" });
  });

  it("still show a photo uploaded before pictures replaced uploads", () => {
    expect(readAvatar("data:image/jpeg;base64,AAAA")).toEqual({ kind: "photo", src: "data:image/jpeg;base64,AAAA" });
  });

  it("show nothing for no picture, a picture that no longer exists, or anything else", () => {
    for (const url of [null, undefined, "", "avatar:unicorn", "https://example.com/me.png", "javascript:alert(1)"]) {
      expect(readAvatar(url), String(url)).toEqual({ kind: "none" });
    }
  });
});
