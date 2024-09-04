import { BehaviorSubject, of, Subject } from "rxjs";

import { UserId } from "@bitwarden/common/types/guid";

import { awaitAsync, FakeSingleUserState, ObservableTracker } from "../../../spec";
import { StateConstraints } from "../types";

import { UserStateSubject } from "./user-state-subject";

const SomeUser = "some user" as UserId;
type TestType = { foo: string };

function fooMinLength(minLength: number): StateConstraints<TestType> {
  return Object.freeze({
    constraints: { foo: { minLength } },
    normalize: function (state: TestType): TestType {
      return {
        foo: state.foo.slice(0, this.constraints.foo.minLength),
      };
    },
    finalize: function (state: TestType): TestType {
      return {
        foo: `finalized|${state.foo.slice(0, this.constraints.foo.minLength)}`,
      };
    },
  });
}

describe("UserStateSubject", () => {
  describe("dependencies", () => {
    it("ignores repeated when$ emissions", async () => {
      // this test looks for `nextValue` because a subscription isn't necessary for
      // the subject to update
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const nextValue = jest.fn((_, next) => next);
      const when$ = new BehaviorSubject(true);
      const subject = new UserStateSubject(state, { singleUserId$, nextValue, when$ });

      // the interleaved await asyncs are only necessary b/c `nextValue` is called asynchronously
      subject.next({ foo: "next" });
      await awaitAsync();
      when$.next(true);
      await awaitAsync();
      when$.next(true);
      when$.next(true);
      await awaitAsync();

      expect(nextValue).toHaveBeenCalledTimes(1);
    });

    it("ignores repeated singleUserId$ emissions", async () => {
      // this test looks for `nextValue` because a subscription isn't necessary for
      // the subject to update
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const nextValue = jest.fn((_, next) => next);
      const when$ = new BehaviorSubject(true);
      const subject = new UserStateSubject(state, { singleUserId$, nextValue, when$ });

      // the interleaved await asyncs are only necessary b/c `nextValue` is called asynchronously
      subject.next({ foo: "next" });
      await awaitAsync();
      singleUserId$.next(SomeUser);
      await awaitAsync();
      singleUserId$.next(SomeUser);
      singleUserId$.next(SomeUser);
      await awaitAsync();

      expect(nextValue).toHaveBeenCalledTimes(1);
    });

    it("waits for constraints$", async () => {
      const state = new FakeSingleUserState<TestType>(SomeUser, { foo: "init" });
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const constraints$ = new Subject<StateConstraints<TestType>>();
      const subject = new UserStateSubject(state, { singleUserId$, constraints$ });
      const tracker = new ObservableTracker(subject);

      constraints$.next(fooMinLength(3));
      const [initResult] = await tracker.pauseUntilReceived(1);

      expect(initResult).toEqual({ foo: "ini" });
    });
  });

  describe("next", () => {
    it("emits the next value", async () => {
      const state = new FakeSingleUserState<TestType>(SomeUser, { foo: "init" });
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const subject = new UserStateSubject(state, { singleUserId$ });
      const expected: TestType = { foo: "next" };

      let actual: TestType = null;
      subject.subscribe((value) => {
        actual = value;
      });
      subject.next(expected);
      await awaitAsync();

      expect(actual).toEqual(expected);
    });

    it("ceases emissions once complete", async () => {
      const initialState = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialState);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const subject = new UserStateSubject(state, { singleUserId$ });

      let actual: TestType = null;
      subject.subscribe((value) => {
        actual = value;
      });
      subject.complete();
      subject.next({ foo: "ignored" });
      await awaitAsync();

      expect(actual).toEqual(initialState);
    });

    it("evaluates shouldUpdate", async () => {
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const shouldUpdate = jest.fn(() => true);
      const subject = new UserStateSubject(state, { singleUserId$, shouldUpdate });

      const nextVal: TestType = { foo: "next" };
      subject.next(nextVal);
      await awaitAsync();

      expect(shouldUpdate).toHaveBeenCalledWith(initialValue, nextVal, null);
    });

    it("evaluates shouldUpdate with a dependency", async () => {
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const shouldUpdate = jest.fn(() => true);
      const dependencyValue = { bar: "dependency" };
      const subject = new UserStateSubject(state, {
        singleUserId$,
        shouldUpdate,
        dependencies$: of(dependencyValue),
      });

      const nextVal: TestType = { foo: "next" };
      subject.next(nextVal);
      await awaitAsync();

      expect(shouldUpdate).toHaveBeenCalledWith(initialValue, nextVal, dependencyValue);
    });

    it("emits a value when shouldUpdate returns `true`", async () => {
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const shouldUpdate = jest.fn(() => true);
      const subject = new UserStateSubject(state, { singleUserId$, shouldUpdate });
      const expected: TestType = { foo: "next" };

      let actual: TestType = null;
      subject.subscribe((value) => {
        actual = value;
      });
      subject.next(expected);
      await awaitAsync();

      expect(actual).toEqual(expected);
    });

    it("retains the current value when shouldUpdate returns `false`", async () => {
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const shouldUpdate = jest.fn(() => false);
      const subject = new UserStateSubject(state, { singleUserId$, shouldUpdate });

      subject.next({ foo: "next" });
      await awaitAsync();
      let actual: TestType = null;
      subject.subscribe((value) => {
        actual = value;
      });

      expect(actual).toEqual(initialValue);
    });

    it("evaluates nextValue", async () => {
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const nextValue = jest.fn((_, next) => next);
      const subject = new UserStateSubject(state, { singleUserId$, nextValue });

      const nextVal: TestType = { foo: "next" };
      subject.next(nextVal);
      await awaitAsync();

      expect(nextValue).toHaveBeenCalledWith(initialValue, nextVal, null);
    });

    it("evaluates nextValue with a dependency", async () => {
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const nextValue = jest.fn((_, next) => next);
      const dependencyValue = { bar: "dependency" };
      const subject = new UserStateSubject(state, {
        singleUserId$,
        nextValue,
        dependencies$: of(dependencyValue),
      });

      const nextVal: TestType = { foo: "next" };
      subject.next(nextVal);
      await awaitAsync();

      expect(nextValue).toHaveBeenCalledWith(initialValue, nextVal, dependencyValue);
    });

    it("evaluates nextValue when when$ is true", async () => {
      // this test looks for `nextValue` because a subscription isn't necessary for
      // the subject to update
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const nextValue = jest.fn((_, next) => next);
      const when$ = new BehaviorSubject(true);
      const subject = new UserStateSubject(state, { singleUserId$, nextValue, when$ });

      const nextVal: TestType = { foo: "next" };
      subject.next(nextVal);
      await awaitAsync();

      expect(nextValue).toHaveBeenCalled();
    });

    it("waits to evaluate nextValue until when$ is true", async () => {
      // this test looks for `nextValue` because a subscription isn't necessary for
      // the subject to update.
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const nextValue = jest.fn((_, next) => next);
      const when$ = new BehaviorSubject(false);
      const subject = new UserStateSubject(state, { singleUserId$, nextValue, when$ });

      const nextVal: TestType = { foo: "next" };
      subject.next(nextVal);
      await awaitAsync();
      expect(nextValue).not.toHaveBeenCalled();

      when$.next(true);
      await awaitAsync();
      expect(nextValue).toHaveBeenCalled();
    });

    it("waits to evaluate nextValue until singleUserId$ emits", async () => {
      // this test looks for `nextValue` because a subscription isn't necessary for
      // the subject to update.
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new Subject<UserId>();
      const nextValue = jest.fn((_, next) => next);
      const subject = new UserStateSubject(state, { singleUserId$, nextValue });

      const nextVal: TestType = { foo: "next" };
      subject.next(nextVal);
      await awaitAsync();
      expect(nextValue).not.toHaveBeenCalled();
      singleUserId$.next(SomeUser);
      await awaitAsync();

      expect(nextValue).toHaveBeenCalled();
    });

    it("applies constraints$ on init", async () => {
      const state = new FakeSingleUserState<TestType>(SomeUser, { foo: "init" });
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const constraints$ = new BehaviorSubject(fooMinLength(2));
      const subject = new UserStateSubject(state, { singleUserId$, constraints$ });
      const tracker = new ObservableTracker(subject);

      const [result] = await tracker.pauseUntilReceived(1);

      expect(result).toEqual({ foo: "in" });
    });

    it("applies constraints$ on constraints$ emission", async () => {
      const state = new FakeSingleUserState<TestType>(SomeUser, { foo: "init" });
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const constraints$ = new BehaviorSubject(fooMinLength(2));
      const subject = new UserStateSubject(state, { singleUserId$, constraints$ });
      const tracker = new ObservableTracker(subject);

      constraints$.next(fooMinLength(1));
      const [, result] = await tracker.pauseUntilReceived(2);

      expect(result).toEqual({ foo: "i" });
    });

    it("applies constraints$ on next", async () => {
      const state = new FakeSingleUserState<TestType>(SomeUser, { foo: "init" });
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const constraints$ = new BehaviorSubject(fooMinLength(2));
      const subject = new UserStateSubject(state, { singleUserId$, constraints$ });
      const tracker = new ObservableTracker(subject);

      subject.next({ foo: "next" });
      const [, result] = await tracker.pauseUntilReceived(2);

      expect(result).toEqual({ foo: "ne" });
    });

    it("applies latest constraints$ on next", async () => {
      const state = new FakeSingleUserState<TestType>(SomeUser, { foo: "init" });
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const constraints$ = new BehaviorSubject(fooMinLength(2));
      const subject = new UserStateSubject(state, { singleUserId$, constraints$ });
      const tracker = new ObservableTracker(subject);

      constraints$.next(fooMinLength(3));
      subject.next({ foo: "next" });
      const [, , result] = await tracker.pauseUntilReceived(3);

      expect(result).toEqual({ foo: "nex" });
    });

    it("waits for constraints$", async () => {
      const state = new FakeSingleUserState<TestType>(SomeUser, { foo: "init" });
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const constraints$ = new Subject<StateConstraints<TestType>>();
      const subject = new UserStateSubject(state, { singleUserId$, constraints$ });
      const tracker = new ObservableTracker(subject);

      subject.next({ foo: "next" });
      constraints$.next(fooMinLength(3));
      // `init` is also waiting and is processed before `next`
      const [, nextResult] = await tracker.pauseUntilReceived(2);

      expect(nextResult).toEqual({ foo: "nex" });
    });

    it("uses the last-emitted value from constraints$ when constraints$ errors", async () => {
      const state = new FakeSingleUserState<TestType>(SomeUser, { foo: "init" });
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const constraints$ = new BehaviorSubject(fooMinLength(3));
      const subject = new UserStateSubject(state, { singleUserId$, constraints$ });
      const tracker = new ObservableTracker(subject);

      constraints$.error({ some: "error" });
      subject.next({ foo: "next" });
      const [, nextResult] = await tracker.pauseUntilReceived(1);

      expect(nextResult).toEqual({ foo: "nex" });
    });

    it("uses the last-emitted value from constraints$ when constraints$ completes", async () => {
      const state = new FakeSingleUserState<TestType>(SomeUser, { foo: "init" });
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const constraints$ = new BehaviorSubject(fooMinLength(3));
      const subject = new UserStateSubject(state, { singleUserId$, constraints$ });
      const tracker = new ObservableTracker(subject);

      constraints$.complete();
      subject.next({ foo: "next" });
      const [, nextResult] = await tracker.pauseUntilReceived(1);

      expect(nextResult).toEqual({ foo: "nex" });
    });
  });

  describe("error", () => {
    it("emits errors", async () => {
      const state = new FakeSingleUserState<TestType>(SomeUser, { foo: "init" });
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const subject = new UserStateSubject(state, { singleUserId$ });
      const expected: TestType = { foo: "error" };

      let actual: TestType = null;
      subject.subscribe({
        error: (value: unknown) => {
          actual = value as any;
        },
      });
      subject.error(expected);
      await awaitAsync();

      expect(actual).toEqual(expected);
    });

    it("ceases emissions once errored", async () => {
      const initialState = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialState);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const subject = new UserStateSubject(state, { singleUserId$ });

      let actual: TestType = null;
      subject.subscribe({
        error: (value: unknown) => {
          actual = value as any;
        },
      });
      subject.error("expectedError");
      subject.error("ignored");
      await awaitAsync();

      expect(actual).toEqual("expectedError");
    });

    it("ceases emissions once complete", async () => {
      const initialState = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialState);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const subject = new UserStateSubject(state, { singleUserId$ });

      let shouldNotRun = false;
      subject.subscribe({
        error: () => {
          shouldNotRun = true;
        },
      });
      subject.complete();
      subject.error("ignored");
      await awaitAsync();

      expect(shouldNotRun).toBeFalsy();
    });
  });

  describe("complete", () => {
    it("emits completes", async () => {
      const state = new FakeSingleUserState<TestType>(SomeUser, { foo: "init" });
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const subject = new UserStateSubject(state, { singleUserId$ });

      let actual = false;
      subject.subscribe({
        complete: () => {
          actual = true;
        },
      });
      subject.complete();
      await awaitAsync();

      expect(actual).toBeTruthy();
    });

    it("ceases emissions once errored", async () => {
      const initialState = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialState);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const subject = new UserStateSubject(state, { singleUserId$ });

      let shouldNotRun = false;
      subject.subscribe({
        complete: () => {
          shouldNotRun = true;
        },
        // prevent throw
        error: () => {},
      });
      subject.error("occurred");
      subject.complete();
      await awaitAsync();

      expect(shouldNotRun).toBeFalsy();
    });

    it("ceases emissions once complete", async () => {
      const initialState = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialState);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const subject = new UserStateSubject(state, { singleUserId$ });

      let timesRun = 0;
      subject.subscribe({
        complete: () => {
          timesRun++;
        },
      });
      subject.complete();
      subject.complete();
      await awaitAsync();

      expect(timesRun).toEqual(1);
    });
  });

  describe("subscribe", () => {
    it("completes when singleUserId$ completes", async () => {
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const subject = new UserStateSubject(state, { singleUserId$ });

      let actual = false;
      subject.subscribe({
        complete: () => {
          actual = true;
        },
      });
      singleUserId$.complete();
      await awaitAsync();

      expect(actual).toBeTruthy();
    });

    it("completes when when$ completes", async () => {
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const when$ = new BehaviorSubject(true);
      const subject = new UserStateSubject(state, { singleUserId$, when$ });

      let actual = false;
      subject.subscribe({
        complete: () => {
          actual = true;
        },
      });
      when$.complete();
      await awaitAsync();

      expect(actual).toBeTruthy();
    });

    // FIXME: add test for `this.state.catch` once `FakeSingleUserState` supports
    // simulated errors

    it("errors when singleUserId$ changes", async () => {
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const subject = new UserStateSubject(state, { singleUserId$ });
      const errorUserId = "error" as UserId;

      let error = false;
      subject.subscribe({
        error: (e: unknown) => {
          error = e as any;
        },
      });
      singleUserId$.next(errorUserId);
      await awaitAsync();

      expect(error).toEqual({ expectedUserId: SomeUser, actualUserId: errorUserId });
    });

    it("errors when singleUserId$ errors", async () => {
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const subject = new UserStateSubject(state, { singleUserId$ });
      const expected = { error: "description" };

      let actual = false;
      subject.subscribe({
        error: (e: unknown) => {
          actual = e as any;
        },
      });
      singleUserId$.error(expected);
      await awaitAsync();

      expect(actual).toEqual(expected);
    });

    it("errors when when$ errors", async () => {
      const initialValue: TestType = { foo: "init" };
      const state = new FakeSingleUserState<TestType>(SomeUser, initialValue);
      const singleUserId$ = new BehaviorSubject(SomeUser);
      const when$ = new BehaviorSubject(true);
      const subject = new UserStateSubject(state, { singleUserId$, when$ });
      const expected = { error: "description" };

      let actual = false;
      subject.subscribe({
        error: (e: unknown) => {
          actual = e as any;
        },
      });
      when$.error(expected);
      await awaitAsync();

      expect(actual).toEqual(expected);
    });
  });

  describe("userId", () => {
    it("returns the userId to which the subject is bound", () => {
      const state = new FakeSingleUserState<TestType>(SomeUser, { foo: "init" });
      const singleUserId$ = new Subject<UserId>();
      const subject = new UserStateSubject(state, { singleUserId$ });

      expect(subject.userId).toEqual(SomeUser);
    });
  });
});
