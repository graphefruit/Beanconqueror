/**
 * Inherits all roasting types
 */
export enum BREW_QUANTITY_TYPES_ENUM {
  GR = 'gr',
  ML = 'ml',
}

/**
 * Brews store the key ('GR'). Before, the barista mode stored the value
 * ('gr'); those brews are read as they are, without rewriting them.
 */
export function brewQuantityTypeName(type: string): string {
  const values: string[] = Object.values(BREW_QUANTITY_TYPES_ENUM);
  return (
    BREW_QUANTITY_TYPES_ENUM[type as keyof typeof BREW_QUANTITY_TYPES_ENUM] ??
    (values.includes(type) ? type : '')
  );
}
