import {
  DelimiterPatternExpression,
  ExpiryFullYearPattern,
  ExpiryFullYearPatternExpression,
  IrrelevantExpiryCharactersPatternExpression,
  MonthPatternExpression,
} from "@bitwarden/common/autofill/constants";
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
      let parsedMonth = parseInt(expMonth) - 1;

      // Add a month floor of 0 to protect against an invalid low month value of "0" or negative integers
      if (parsedMonth < 1) {
        parsedMonth = 0;
      }

      const parsedYear = parseInt(normalizedYear);

      // First day of the next month minus one, to get last day of the card month
      const cardExpiry = new Date(parsedYear, parsedMonth + 1, 0);

      return cardExpiry < now;
    }
  }

  return false;
}

/**
 * Attempt to split a string into date segments on the basis of expected formats and delimiter symbols.
 *
 * @param {string} combinedExpiryValue
 * @return {*}  {string[]}
 */
function splitCombinedDateValues(combinedExpiryValue: string): string[] {
  let sanitizedValue = combinedExpiryValue
    .replace(IrrelevantExpiryCharactersPatternExpression, "")
    .trim();

  // Do this after initial value replace to avoid identifying leading whitespace as delimiter
  const parsedDelimiter = sanitizedValue.match(DelimiterPatternExpression)?.[0] || null;

  let dateParts = [sanitizedValue];

  if (parsedDelimiter?.length) {
    // If the parsed delimiter is a whitespace character, assign 's' (character class) instead
    const delimiterPattern = /\s/.test(parsedDelimiter) ? "\\s" : "\\" + parsedDelimiter;

    sanitizedValue = sanitizedValue
      // Remove all other delimiter characters not identified as the delimiter
      .replace(new RegExp(`[^\\d${delimiterPattern}]`, "g"), "")
      // Also de-dupe the delimiter character
      .replace(new RegExp(`[${delimiterPattern}]{2,}`, "g"), parsedDelimiter);

    dateParts = sanitizedValue.split(parsedDelimiter);
  }

  return (
    dateParts
      // remove values that have no length
      .filter((splitValue) => splitValue?.length)
  );
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

  const dateParts = splitCombinedDateValues(combinedExpiryValue);

  if (dateParts.length < 1) {
    return [null, null];
  }

  const sanitizedFirstPart =
    dateParts[0]?.replace(IrrelevantExpiryCharactersPatternExpression, "") || "";
  const sanitizedSecondPart =
    dateParts[1]?.replace(IrrelevantExpiryCharactersPatternExpression, "") || "";

  // If there is only one date part, no delimiter was found in the passed value
  if (dateParts.length === 1) {
    if (sanitizedFirstPart.length > 4) {
      // If the value is over 5-characters long, it likely has a full year format in it
      // e.g.
      // "052024"
      // "202405"
      // "20245"
      // "52024"
      const [year, month] = dateParts[0]
        .split(new RegExp(`(?=${ExpiryFullYearPattern})|(?<=${ExpiryFullYearPattern})`, "g"))
        .sort((current, next) => (current.length > next.length ? -1 : 1));
      parsedYear = year;
      parsedMonth = month;
    } else if (sanitizedFirstPart.length === 4) {
      // If the `sanitizedFirstPart` value is a length of 4, it must be split in half, since
      // neither a year or month will be represented with three characters
      // e.g.
      // "0524"
      // "2405"

      const splitFirstPartFirstHalf = sanitizedFirstPart.slice(0, 2);
      const splitFirstPartSecondHalf = sanitizedFirstPart.slice(-2);

      parsedYear = splitFirstPartSecondHalf;
      parsedMonth = splitFirstPartFirstHalf;

      // If the first part doesn't match a month pattern, assume it's a year
      if (!MonthPatternExpression.test(splitFirstPartFirstHalf)) {
        parsedYear = splitFirstPartFirstHalf;
        parsedMonth = splitFirstPartSecondHalf;
      }
    } else {
      // A valid year representation here must be two characters so try to find it first.
      // e.g.
      // "245"
      // "202"
      // "212"
      // "022"
      // "111"

      // split if there is a digit with a leading zero
      const splitFirstPartOnLeadingZero = sanitizedFirstPart.split(/(?<=0[1-9]{1})|(?=0[1-9]{1})/);

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
        const normalizedParsedYearAlternative = parseInt(
          normalizeExpiryYearFormat(sanitizedFirstPart.slice(-2)),
          10,
        );

        if (normalizedParsedYear < currentYear && normalizedParsedYearAlternative >= currentYear) {
          parsedYear = sanitizedFirstPart.slice(-2);
          parsedMonth = sanitizedFirstPart.slice(0, 1);
        }
      }
    }
  }
  // There are multiple date parts
  else {
    // Conditionals here are structured to avoid unnecessary evaluations and
    // are ordered from more authoritative checks to checks yielding inferred conclusions
    if (
      // If a 4-digit value is found (when there are multiple parts), it can't be month
      ExpiryFullYearPatternExpression.test(sanitizedFirstPart)
    ) {
      parsedYear = sanitizedFirstPart;
      parsedMonth = sanitizedSecondPart;
    } else if (
      // If a 4-digit value is found (when there are multiple parts), it can't be month
      ExpiryFullYearPatternExpression.test(sanitizedSecondPart)
    ) {
      parsedYear = sanitizedSecondPart;
      parsedMonth = sanitizedFirstPart;
    } else if (
      // If it's a two digit value that doesn't match against month pattern, assume it's a year
      /\d{2}/.test(sanitizedFirstPart) &&
      !MonthPatternExpression.test(sanitizedFirstPart)
    ) {
      parsedYear = sanitizedFirstPart;
      parsedMonth = sanitizedSecondPart;
    } else if (
      // If it's a two digit value that doesn't match against month pattern, assume it's a year
      /\d{2}/.test(sanitizedSecondPart) &&
      !MonthPatternExpression.test(sanitizedSecondPart)
    ) {
      parsedYear = sanitizedSecondPart;
      parsedMonth = sanitizedFirstPart;
    } else {
      // Values are too ambiguous (e.g. "12/09"). For the most part,
      // a month-looking value likely is, at the time of writing (year 2024).
      parsedYear = sanitizedFirstPart;
      parsedMonth = sanitizedSecondPart;

      if (MonthPatternExpression.test(sanitizedFirstPart)) {
        parsedYear = sanitizedSecondPart;
        parsedMonth = sanitizedFirstPart;
      }
    }
  }

  const normalizedParsedYear = normalizeExpiryYearFormat(parsedYear);
  const normalizedParsedMonth = parsedMonth?.replace(/^0+/, "").slice(0, 2);

  // set "empty" values to null
  parsedYear = normalizedParsedYear?.length ? normalizedParsedYear : null;
  parsedMonth = normalizedParsedMonth?.length ? normalizedParsedMonth : null;

  return [parsedYear, parsedMonth];
}
