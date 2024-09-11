import { Constraint } from "@bitwarden/common/tools/types";

import { sum } from "../util";

const AtLeastOne: Constraint<number> = { min: 1 };
const RequiresTrue: Constraint<boolean> = { requiredValue: true };

// ensures the length constraint bounds are at least as large as the sum of the dependencies
function atLeastSum(current: Constraint<number>, dependencies: Constraint<number>[]) {
  // length must be at least as long as the required character set
  const minConsistentLength = sum(...dependencies.map((c) => c?.min));
  const minLength = Math.max(current?.min ?? 0, minConsistentLength);
  const length = atLeast(minLength, current);

  return length;
}

// when `readonly`, add readonly field to copy
function maybeReadonly(readonly: boolean, constraint?: Constraint<boolean>): Constraint<boolean> {
  if (!readonly) {
    return constraint;
  }

  const result: Constraint<boolean> = Object.assign({}, constraint ?? {});
  result.readonly = true;

  return Object.freeze(result);
}

// lifetime: moves `constraint` or `defaultConstraint` into return
function maybe<T>(enabled: boolean, constraint: Constraint<T>): Constraint<T> {
  return enabled ? constraint : undefined;
}

// copies `constraint`; ensures both bounds >= value
function atLeast(minimum: number, constraint?: Constraint<number>): Constraint<number> {
  const atLeast: Constraint<number> = {
    ...(constraint ?? {}),
    min: Math.max(constraint?.min ?? -Infinity, minimum),
  };

  if ("max" in atLeast) {
    atLeast.max = Math.max(atLeast.max, minimum);
  }

  return atLeast;
}

function fitToBounds(value: number, constraint: Constraint<number>) {
  if (!constraint) {
    return value;
  }

  const { min, max } = constraint;

  const withUpperBound = Math.min(value ?? 0, max ?? Infinity);
  const withLowerBound = Math.max(withUpperBound, min ?? -Infinity);

  return withLowerBound;
}

function enforceConstant(value: boolean, constraint: Constraint<boolean>) {
  if (constraint?.readonly) {
    return constraint.requiredValue;
  } else {
    return value;
  }
}

export {
  atLeast,
  atLeastSum,
  maybe,
  maybeReadonly,
  fitToBounds,
  enforceConstant,
  AtLeastOne,
  RequiresTrue,
};
