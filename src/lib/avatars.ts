/**
 * The profile pictures a person can choose from (there's no uploading). Each
 * one is an image in src/assets/avatars/<id>.png, listed in
 * src/components/app/avatar-assets.ts; the order here is the order of the
 * picker grid.
 *
 * The choice is stored in User.avatarUrl as "avatar:<id>", like an account's
 * "bank:<id>" icon. A data: URL there is a photo uploaded before pictures
 * replaced uploads, and still shows until the person picks one.
 */
export const AVATARS = [
  { id: "person-01", label: "Curly hair, orange jumper" },
  { id: "person-02", label: "Long hair, green top" },
  { id: "person-03", label: "Glasses and collar" },
  { id: "person-04", label: "Hair bun" },
  { id: "person-05", label: "Wavy hair, earrings" },
  { id: "person-06", label: "Green cap" },
  { id: "person-07", label: "Long hair, cream top" },
  { id: "person-08", label: "Green hoodie" },
  { id: "person-09", label: "Striped top" },
  { id: "person-10", label: "Cream hoodie" },
  { id: "person-11", label: "Wearing headphones" },
  { id: "person-12", label: "White cap" },
  { id: "person-13", label: "Black hoodie" },
  { id: "person-14", label: "Hijab" },
  { id: "person-15", label: "Glasses, green jumper" },
  { id: "cat", label: "Cat" },
  { id: "dog", label: "Dog" },
  { id: "rabbit", label: "Rabbit" },
  { id: "panda", label: "Panda" },
  { id: "fox", label: "Fox" },
  { id: "penguin", label: "Penguin" },
  { id: "bird", label: "Bird" },
  { id: "turtle", label: "Turtle" },
  { id: "deer", label: "Deer" },
  { id: "plant", label: "Potted plant" },
  { id: "cactus", label: "Cactus" },
  { id: "flower", label: "Flower" },
  { id: "mountains", label: "Mountains" },
  { id: "wave", label: "Wave" },
  { id: "palm", label: "Palm tree" },
  { id: "coffee", label: "Coffee" },
  { id: "boba", label: "Bubble tea" },
  { id: "gamepad", label: "Game controller" },
  { id: "headphones", label: "Headphones" },
  { id: "record", label: "Vinyl record" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

export const AVATAR_IDS = AVATARS.map((a) => a.id) as [AvatarId, ...AvatarId[]];

/** Where a newly chosen picture starts: the first one. */
export const DEFAULT_AVATAR: AvatarId = AVATARS[0].id;

const PREFIX = "avatar:";

/** The value stored in User.avatarUrl for a picture. */
export const avatarUrlFor = (id: AvatarId) => `${PREFIX}${id}`;

export function isAvatarId(value: string): value is AvatarId {
  return (AVATAR_IDS as string[]).includes(value);
}

/**
 * What a stored User.avatarUrl shows: one of the pictures, an uploaded photo
 * (data: URL) from before pictures replaced uploads, or nothing.
 */
export function readAvatar(url: string | null | undefined):
  | { kind: "picture"; id: AvatarId }
  | { kind: "photo"; src: string }
  | { kind: "none" } {
  if (url?.startsWith(PREFIX)) {
    const id = url.slice(PREFIX.length);
    return isAvatarId(id) ? { kind: "picture", id } : { kind: "none" };
  }
  if (url?.startsWith("data:image/")) return { kind: "photo", src: url };
  return { kind: "none" };
}
