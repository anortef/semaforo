import fc from "fast-check";

const LOWER_ALPHANUM = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
const LOWER_ALPHANUM_HYPHEN = "abcdefghijklmnopqrstuvwxyz0123456789-".split("");
const ALPHA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ALPHANUM =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

const fromChars = (chars: string[]) => fc.constantFrom(...chars);

export const lowerHyphenKey = (): fc.Arbitrary<string> =>
  fc
    .tuple(
      fromChars(LOWER_ALPHANUM),
      fc.array(fromChars(LOWER_ALPHANUM_HYPHEN), { maxLength: 30 }),
      fromChars(LOWER_ALPHANUM),
    )
    .map(([first, middle, last]) => first + middle.join("") + last);

export const camelCaseKey = (): fc.Arbitrary<string> =>
  fc
    .tuple(fromChars(ALPHA), fc.array(fromChars(ALPHANUM), { maxLength: 30 }))
    .map(([first, rest]) => first + rest.join(""));

export const nonEmptyName = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

export const percentage = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 100 });

export const cacheTtl = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 86400 });

export const invalidLowerHyphenKey = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant(""),
    fc.constant("-"),
    fc.constant("a"), // single char fails (regex requires >= 2)
    lowerHyphenKey().map((k) => "-" + k),
    lowerHyphenKey().map((k) => k + "-"),
    lowerHyphenKey().map((k) => k + "!"),
    lowerHyphenKey().map((k) => k.toUpperCase() + "A"), // guarantee an uppercase char
  );

export const invalidCamelCaseKey = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant(""),
    fc.constant("1"),
    camelCaseKey().map((k) => "1" + k),
    camelCaseKey().map((k) => "-" + k),
    camelCaseKey().map((k) => k + "-"),
    camelCaseKey().map((k) => k + " "),
  );
