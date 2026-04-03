import { randomBytes } from "node:crypto";

const HUMAN_SAFE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCharacters(length: number) {
  const bytes = randomBytes(length);
  let output = "";

  for (let index = 0; index < length; index += 1) {
    output += HUMAN_SAFE_ALPHABET[bytes[index] % HUMAN_SAFE_ALPHABET.length];
  }

  return output;
}

function slugifyName(name: string) {
  const normalized = name.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  return normalized.slice(0, 4) || "RIDE";
}

export function createReferralCode(name: string) {
  return `${slugifyName(name)}${randomCharacters(4)}`;
}

export function createPublicTrackingToken() {
  return randomCharacters(18);
}

export function createCommunityAccessToken() {
  return randomCharacters(24);
}
