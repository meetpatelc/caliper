export function fieldErrorId(htmlFor: string) {
  return `${htmlFor}-error`;
}

/**
 * The id for a field's helper text.
 *
 * Every field in the library carries help text and none of it reached a screen
 * reader: the hint had no id, so nothing could point `aria-describedby` at it,
 * and because it sat inside the wrapping `<label>` it was folded into the
 * control's accessible *name* instead — read out as part of the label, or not
 * at all, depending on the reader.
 */
export function fieldHintId(htmlFor: string) {
  return `${htmlFor}-hint`;
}
