# Auditing the tests after a larger change

A green suite is not evidence that the tests are still the right tests. This audit is a
required step, not an optional tidy-up, and it belongs in the same commit or an adjacent one,
never "later".

Tests that contradict the new behaviour fail loudly and get fixed on their own. The ones worth
hunting are those that still pass:

- **Tests that now assert the wrong thing.** A test kept alive by editing selectors and values
  until it went green again may no longer describe behaviour anyone wants. Ask what would break
  in the product if this test failed — if the answer is "nothing a user would notice", it is
  testing the implementation.
- **Tests made redundant by a better one.** After adding a test that plays a workflow through,
  older tests that poked at one intermediate step of it are often dead weight. Prefer the test
  that covers the user-visible consequence, keep the cheap unit test underneath it, and drop
  what sits in between.
- **Tests at the wrong level.** Reaching through the full UI to assert a storage key, or
  rendering a component to check a pure function, is the most expensive way to learn the least.
  If a unit test already covers the mechanism and an integration test covers the visible result,
  the one in the middle can go.
- **Tests that now enshrine sloppiness.** If a test had to be updated to expect something odd —
  an empty string in a list, a value that is trimmed elsewhere — decide whether the odd value is
  genuinely the contract, and say so in a comment, or fix the code instead of the expectation.
- **What the change left behind.** Unused translation keys, helpers, fixtures and test utilities
  that nothing calls any more. Unused catalog keys are easy to miss because the key-parity test
  only compares `de.json` against `en.json`; it never asks whether anything uses a key. Check
  them against the non-test sources.

Report what was removed and why, and say explicitly which near-duplicates were kept and what
distinguishes them — a deletion nobody can second-guess is a deletion nobody can catch when it
was wrong.
