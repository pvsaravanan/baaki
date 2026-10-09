/**
 * The profile pictures a person can choose from (there's no uploading): Open
 * Peeps characters (CC0, by Pablo Stanley), drawn by scripts/make-avatars.ts
 * into src/assets/avatars/<id>.svg and listed in
 * src/components/app/avatar-assets.ts. People of every age are spread through
 * the list, which is the order of the picker grid.
 *
 * The choice is stored in User.avatarUrl as "avatar:<id>", like an account's
 * "bank:<id>" icon. A data: URL there is a photo uploaded before pictures
 * replaced uploads, and still shows until the person picks one.
 */
export const AVATARS = [
  { id: "peep-01", label: "Tousled hair, coral top" },
  { id: "peep-02", label: "Long hair, green top" },
  { id: "peep-40", label: "Grandma, bun and glasses" },
  { id: "peep-03", label: "Short hair, glasses" },
  { id: "peep-36", label: "Toddler with bows" },
  { id: "peep-04", label: "Hair bun with headband" },
  { id: "peep-05", label: "Long curly hair" },
  { id: "peep-42", label: "Older man, grey hair" },
  { id: "peep-06", label: "Wide-brim hat" },
  { id: "peep-37", label: "Little one, hair tuft" },
  { id: "peep-07", label: "Straight hair, cream top" },
  { id: "peep-08", label: "Afro" },
  { id: "peep-10", label: "Quiff and moustache" },
  { id: "peep-09", label: "Bob with fringe" },
  { id: "peep-44", label: "Older woman, hijab" },
  { id: "peep-38", label: "Child, curly top" },
  { id: "peep-11", label: "Beanie" },
  { id: "peep-12", label: "Hijab" },
  { id: "peep-41", label: "Older woman, silver hair" },
  { id: "peep-13", label: "Curly locks" },
  { id: "peep-14", label: "Medium hair, glasses" },
  { id: "peep-15", label: "Shaved sides, beard" },
  { id: "peep-39", label: "Child with puffs" },
  { id: "peep-16", label: "Turban and beard" },
  { id: "peep-17", label: "Straight fringe" },
  { id: "peep-43", label: "Grandpa, bald with glasses" },
  { id: "peep-18", label: "Big afro" },
  { id: "peep-19", label: "Side parting, glasses" },
  { id: "peep-20", label: "Cornrows" },
  { id: "peep-21", label: "Shoulder-length hair" },
  { id: "peep-22", label: "Bald, moustache, glasses" },
  { id: "peep-23", label: "Twists" },
  { id: "peep-45", label: "Older man, turban" },
  { id: "peep-24", label: "Long hair with fringe" },
  { id: "peep-25", label: "Flat top" },
  { id: "peep-26", label: "Messy bun" },
  { id: "peep-27", label: "Buzz cut, goatee" },
  { id: "peep-28", label: "Fringe, shoulder-length" },
  { id: "peep-29", label: "Sunglasses" },
  { id: "peep-30", label: "Bantu knots" },
  { id: "peep-31", label: "Blonde bob" },
  { id: "peep-32", label: "Short hair, beard" },
  { id: "peep-33", label: "Two buns" },
  { id: "peep-34", label: "Wavy hair with fringe" },
  { id: "peep-35", label: "Locks, glasses" },
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
