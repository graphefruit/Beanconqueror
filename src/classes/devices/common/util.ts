export function to128bitUUID(uuid: string) {
  // nothing to do
  switch (uuid.length) {
    case 4:
      return `0000${uuid.toUpperCase()}-0000-1000-8000-00805F9B34FB`;
    case 8:
      return `${uuid.toUpperCase()}-0000-1000-8000-00805F9B34FB`;
    case 36:
      return uuid.toUpperCase();
    default:
      throw new Error('invalid uuid: ' + uuid);
  }
}
