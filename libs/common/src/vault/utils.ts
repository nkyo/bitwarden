import { CardExpiryDateDelimiters } from "@bitwarden/common/autofill/constants";
import { CardView } from "@bitwarden/common/vault/models/view/card.view";

type NonZeroIntegers = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type Year = `${NonZeroIntegers}${NonZeroIntegers}${0 | NonZeroIntegers}${0 | NonZeroIntegers}`;

/**
 * Takes a string or number value and returns a string value formatted as a valid 4-digit year
 *
 * @param {(string | number)} yearInput
 * @return {*}  {(Year | null)}
 */
export function normalizeExpiryYearFormat(yearInput: string | number): Year | null {
  // The input[type="number"] is returning a number, convert it to a string
  // An empty field returns null, avoid casting `"null"` to a string
  const yearInputIsEmpty = yearInput == null || yearInput === "";
  let expirationYear = yearInputIsEmpty ? null : `${yearInput}`;

  // Exit early if year is already formatted correctly or empty
  if (yearInputIsEmpty || /^[1-9]{1}\d{3}$/.test(expirationYear)) {
    return expirationYear as Year;
  }

  expirationYear = expirationYear
    // For safety, because even input[type="number"] will allow decimals
    .replace(/[^\d]/g, "")
    // remove any leading zero padding (leave the last leading zero if it ends the string)
    .replace(/^[0]+(?=.)/, "");

  if (expirationYear === "") {
    expirationYear = null;
  }

  // given the context of payment card expiry, a year character length of 3, or over 4
  // is more likely to be a mistake than an intentional value for the far past or far future.
  if (expirationYear && expirationYear.length !== 4) {
    const paddedYear = ("00" + expirationYear).slice(-2);
    const currentCentury = `${new Date().getFullYear()}`.slice(0, 2);

    expirationYear = currentCentury + paddedYear;
  }

  return expirationYear as Year | null;
}

/**
 * Takes a cipher card view and returns "true" if the month and year affirmativey indicate
 * the card is expired.
 *
 * @param {CardView} cipherCard
 * @return {*}  {boolean}
 */
export function isCardExpired(cipherCard: CardView): boolean {
  if (cipherCard) {
    const { expMonth = null, expYear = null } = cipherCard;

    const now = new Date();
    const normalizedYear = normalizeExpiryYearFormat(expYear);

    // If the card year is before the current year, don't bother checking the month
    if (normalizedYear && parseInt(normalizedYear) < now.getFullYear()) {
      return true;
    }

    if (normalizedYear && expMonth) {
      // `Date` months are zero-indexed
      const parsedMonth =
        parseInt(expMonth) - 1 ||
        // Add a month floor of 0 to protect against an invalid low month value of "0"
        0;

      const parsedYear = parseInt(normalizedYear);

      // First day of the next month minus one, to get last day of the card month
      const cardExpiry = new Date(parsedYear, parsedMonth + 1, 0);

      return cardExpiry < now;
    }
  }

  return false;
}

/**
 * Attempt to parse year and month parts of a combined expiry date value. Used when no
 * other information about the format is available.
 *
 * @param {string} combinedExpiryValue
 * @return {*}  {([string | null, string | null])}
 */
export function parseYearMonthExpiry(combinedExpiryValue: string): [Year | null, string | null] {
  let parsedYear = null;
  let parsedMonth = null;

  const expiryDateDelimitersPattern = "\\" + CardExpiryDateDelimiters.join("\\");
  const delimiterPatternExpression = new RegExp(`[${expiryDateDelimitersPattern}]`, "g");
  const irrelevantExpiryCharactersPattern = new RegExp(
    // "or digits" to ensure numbers are removed from guidance pattern, which aren't covered by ^\w
    `[^\\d${expiryDateDelimitersPattern}]`,
    "g",
  );
  const monthPattern = "(([1]{1}[0-2]{1})|(0?[1-9]{1}))";
  const monthPatternExpression = new RegExp(`^${monthPattern}$`);
  // Because we're dealing with expiry dates, we assume the year will be in current or next century
  const fullYearPattern = "2[0-1]{1}[0-9]{2}";

  let sanitizedValue = combinedExpiryValue.replace(irrelevantExpiryCharactersPattern, "").trim();

  // Do this after initial value replace to avoid identifying leading whitespace as delimiter
  const delimiter = sanitizedValue.match(delimiterPatternExpression)?.[0] || null;

  if (delimiter) {
    const delimiterPattern = delimiter === " " ? "s" : delimiter;
    sanitizedValue = sanitizedValue
      // Remove all other delimiter characters not identified as the delimiter
      .replace(new RegExp(`[^\\d\\${delimiterPattern}]`, "g"), "")
      // Also de-dupe the delimiter character
      .replace(new RegExp(`[\\${delimiterPattern}]{2,}`, "g"), delimiter);
  }

  let dateParts = [sanitizedValue];

  if (delimiter?.length) {
    dateParts = sanitizedValue.split(delimiter);
  }

  if (dateParts.length < 1) {
    return [null, null];
  }

  const sanitizedFirstPart = dateParts[0]?.replace(irrelevantExpiryCharactersPattern, "") || "";
  const sanitizedSecondPart = dateParts[1]?.replace(irrelevantExpiryCharactersPattern, "") || "";

  // If there is only one date part, no delimiter was found in the passed value
  if (dateParts.length === 1) {
    // If the value is over 5-characters long, it likely has a full year format in it
    if (sanitizedFirstPart.length > 4) {
      // e.g.
      // "052024",
      // "202405",
      // "20245",
      // "52024",
      const [year, month] = dateParts[0]
        .split(new RegExp(`(?=${fullYearPattern})|(?<=${fullYearPattern})`, "g"))
        .sort((current, next) => (current.length > next.length ? -1 : 1));
      parsedYear = year;
      parsedMonth = month;
    } else {
      // The `sanitizedFirstPart` value here can't be a full year format (without a missing
      // month), and representing both year and month requires at least three characters, so
      // assume a year representation is two characters and try to find it first.
      // e.g.
      // "0524",
      // "2405",
      // "245",
      // "202"
      // "212"
      // "022"
      // "111"

      // If the `sanitizedFirstPart` value is a length of 4, it must be split in half, since
      // neither a year or month will be represented with three characters
      if (sanitizedFirstPart.length === 4) {
        const splitFirstPartFirstHalf = sanitizedFirstPart.slice(0, 2);
        const splitFirstPartSecondHalf = sanitizedFirstPart.slice(-2);

        parsedYear = splitFirstPartSecondHalf;
        parsedMonth = splitFirstPartFirstHalf;

        if (!monthPatternExpression.test(splitFirstPartFirstHalf)) {
          parsedYear = splitFirstPartFirstHalf;
          parsedMonth = splitFirstPartSecondHalf;
        }
      } else {
        // split on first part if there is a digit with a leading zero
        const splitFirstPartOnLeadingZero = sanitizedFirstPart.split(
          /(?<=0[1-9]{1})|(?=0[1-9]{1})/,
        );

        // Assume a leading zero indicates a month in ambiguous cases (e.g. "202"), since we're
        // dealing with expiry dates and the next two-digit year with a leading zero will be 2100
        if (splitFirstPartOnLeadingZero.length > 1) {
          parsedYear = splitFirstPartOnLeadingZero[0];
          parsedMonth = splitFirstPartOnLeadingZero[1];

          if (splitFirstPartOnLeadingZero[0].startsWith("0")) {
            parsedMonth = splitFirstPartOnLeadingZero[0];
            parsedYear = splitFirstPartOnLeadingZero[1];
          }
        } else {
          // Here, a year has to be two-digits, and a month can't be more than one, so assume the first two digits that are greater than the current year is the year representation.
          parsedYear = sanitizedFirstPart.slice(0, 2);
          parsedMonth = sanitizedFirstPart.slice(-1);

          const currentYear = new Date().getFullYear();
          const normalizedParsedYear = parseInt(normalizeExpiryYearFormat(parsedYear), 10);
          const normalizedParsedYearAlternative = parseInt(sanitizedFirstPart.slice(-2), 10);

          if (
            normalizedParsedYear < currentYear &&
            normalizedParsedYearAlternative >= currentYear
          ) {
            parsedYear = sanitizedFirstPart.slice(-1);
            parsedMonth = sanitizedFirstPart.slice(0, 2);
          }
        }
      }
    }
  } else {
    // If a 4-digit value is found (when there are multiple parts), it can't be month
    if (/^[1-9]{1}\d{3}$/g.test(sanitizedFirstPart)) {
      parsedYear = sanitizedFirstPart;
      parsedMonth = sanitizedSecondPart;
    } else if (/^[1-9]{1}\d{3}$/g.test(sanitizedSecondPart)) {
      parsedYear = sanitizedSecondPart;
      parsedMonth = sanitizedFirstPart;
    } else if (
      /\d{2}/.test(sanitizedFirstPart) &&
      !monthPatternExpression.test(sanitizedFirstPart)
    ) {
      // If it's a two digit value that doesn't match against month pattern, assume it's a year
      parsedYear = sanitizedFirstPart;
      parsedMonth = sanitizedSecondPart;
    } else if (
      /\d{2}/.test(sanitizedSecondPart) &&
      !monthPatternExpression.test(sanitizedSecondPart)
    ) {
      // If it's a two digit value that doesn't match against month pattern, assume it's a year
      parsedYear = sanitizedSecondPart;
      parsedMonth = sanitizedFirstPart;
    } else {
      // values are too ambiguous (e.g. "12/09"); for the most part, a month-looking value
      // likely is, at the time of writing (year 2024)
      parsedMonth = sanitizedSecondPart;
      parsedYear = sanitizedFirstPart;

      if (monthPatternExpression.test(sanitizedFirstPart)) {
        parsedMonth = sanitizedFirstPart;
        parsedYear = sanitizedSecondPart;
      }
    }
  }

  const nomalizedParsedYear = normalizeExpiryYearFormat(parsedYear);
  const nomalizedParsedMonth = parsedMonth?.replace(/^0+/, "").slice(0, 2);

  // set "empty" values to null
  parsedYear = nomalizedParsedYear?.length ? nomalizedParsedYear : null;
  parsedMonth = nomalizedParsedMonth?.length ? nomalizedParsedMonth : null;

  return [parsedYear, parsedMonth];
}
