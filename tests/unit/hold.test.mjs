import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHold } from '../../pb_public/js/hold.js';

// A stand-in for setTimeout that only fires when the test says so.
function fakeTimer() {
  let pending = null;
  return {
    setTimeout: (fn) => {
      pending = fn;
      return fn;
    },
    clearTimeout: (handle) => {
      if (pending === handle) pending = null;
    },
    fire() {
      const fn = pending;
      pending = null;
      fn?.();
    },
    get running() {
      return pending !== null;
    },
  };
}

const setup = () => {
  const timer = fakeTimer();
  let releases = 0;
  const hold = createHold({ ...timer, onRelease: () => releases++ });
  return { hold, timer, releases: () => releases };
};

const open = { checked: false, checkedAt: 0 };
const done = { checked: true, checkedAt: 5 };

test('given a toggle, then the previous key is held and the timer runs', () => {
  const { hold, timer } = setup();
  hold.toggle('milch', open);
  assert.deepEqual([...hold.keys()], [['milch', open]]);
  assert.equal(timer.running, true);
});

test('given a second toggle of the same item, then the key of the first toggle is kept', () => {
  const { hold } = setup();
  hold.toggle('milch', open);
  hold.toggle('milch', done);
  assert.deepEqual(hold.keys().get('milch'), open);
});

test('given a toggle of another item, then the timer restarts and both are held', () => {
  const { hold, timer, releases } = setup();
  hold.toggle('milch', open);
  hold.toggle('brot', open);
  assert.equal(hold.keys().size, 2);
  timer.fire();
  assert.equal(hold.keys().size, 0);
  assert.equal(releases(), 1);
});

test('given the timer fires, then all keys are released and the callback runs once', () => {
  const { hold, timer, releases } = setup();
  hold.toggle('milch', open);
  hold.toggle('brot', done);
  timer.fire();
  assert.equal(hold.keys().size, 0);
  assert.equal(releases(), 1);
  assert.equal(timer.running, false);
});

test('given a pinned item, when the timer fires, then it stays held while the others are released', () => {
  const { hold, timer } = setup();
  hold.pin('milch', open);
  hold.toggle('brot', done);
  timer.fire();
  assert.deepEqual([...hold.keys().keys()], ['milch']);
});

test('given a pinned item is unpinned, then it is released with the normal delay', () => {
  const { hold, timer, releases } = setup();
  hold.pin('milch', open);
  hold.unpin('milch');
  assert.equal(hold.keys().size, 1);
  assert.equal(timer.running, true);
  timer.fire();
  assert.equal(hold.keys().size, 0);
  assert.equal(releases(), 1);
});

test('given a held item is toggled after being pinned, then the key from before the pin is kept', () => {
  const { hold } = setup();
  hold.pin('milch', open);
  hold.toggle('milch', done);
  assert.deepEqual(hold.keys().get('milch'), open);
});
