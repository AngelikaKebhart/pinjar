/**
 * Gives jsdom the `<dialog>` methods it does not have.
 *
 * jsdom 30 parses `<dialog>` and honours its `open` attribute, but ships no
 * `show()`, `showModal()` or `close()` at all — calling one throws. Without
 * this, every test that opens the data dialog would fail on the browser's
 * absence rather than on anything the extension does.
 *
 * What it deliberately does not do is imitate a modal. The focus trap, Escape,
 * the backdrop and the inertness of the page behind it are exactly why the
 * component uses a native dialog instead of building one, and none of them can
 * be stubbed into existence here. They are checked by driving a real browser,
 * not in jsdom — a stub that pretended to provide them would turn a passing
 * test into a false statement.
 */
if (
  typeof HTMLDialogElement !== 'undefined' &&
  typeof HTMLDialogElement.prototype.showModal !== 'function'
) {
  const open = function open(this: HTMLDialogElement) {
    this.open = true;
  };

  HTMLDialogElement.prototype.show = open;
  HTMLDialogElement.prototype.showModal = open;

  HTMLDialogElement.prototype.close = function close(
    this: HTMLDialogElement,
    returnValue?: string,
  ) {
    if (!this.open) {
      return;
    }

    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }

    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
