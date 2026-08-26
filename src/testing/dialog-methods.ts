/**
 * Gives jsdom the `<dialog>` methods it does not have.
 *
 * jsdom 30 parses `<dialog>` and honours its `open` attribute, but ships no
 * `show()`, `showModal()` or `close()` at all — calling one throws. Without
 * this, every test that opens the data dialog would fail on the browser's
 * absence rather than on anything the extension does.
 *
 * It deliberately does not imitate a modal. The focus trap, Escape, the
 * backdrop and the inertness behind it are why the component uses a native
 * dialog at all, and none of them can be stubbed into existence — pretending
 * otherwise would turn a passing test into a false statement. They are checked
 * by driving a real browser.
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
