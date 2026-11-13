import { crc32 } from 'node:zlib';

/** Name of the file in a backup ZIP that holds the stored values. */
const MAIN_FILE_NAME = 'Beanconqueror.json';

/** 1980-01-01, the earliest date a ZIP entry can hold (MS-DOS format). */
const DOS_DATE_1980_01_01 = 0x21;

/** General purpose flag: the file name is UTF-8. */
const UTF8_NAMES = 0x0800;

/**
 * A backup ZIP like the app's export: the stored values by storage key in
 * `Beanconqueror.json`. The entry is stored without compression, which the
 * app reads like any other ZIP.
 */
export function createBackupZip(data: Record<string, unknown>): Buffer {
  const name = Buffer.from(MAIN_FILE_NAME, 'utf8');
  const content = Buffer.from(JSON.stringify(data), 'utf8');
  const checksum = crc32(content);

  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4); // version needed to extract
  localHeader.writeUInt16LE(UTF8_NAMES, 6);
  localHeader.writeUInt16LE(0, 8); // stored, no compression
  localHeader.writeUInt16LE(0, 10); // time
  localHeader.writeUInt16LE(DOS_DATE_1980_01_01, 12);
  localHeader.writeUInt32LE(checksum, 14);
  localHeader.writeUInt32LE(content.length, 18); // compressed size
  localHeader.writeUInt32LE(content.length, 22); // uncompressed size
  localHeader.writeUInt16LE(name.length, 26);
  localHeader.writeUInt16LE(0, 28); // extra field length

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4); // version made by
  centralHeader.writeUInt16LE(20, 6); // version needed to extract
  centralHeader.writeUInt16LE(UTF8_NAMES, 8);
  centralHeader.writeUInt16LE(0, 10); // stored, no compression
  centralHeader.writeUInt16LE(0, 12); // time
  centralHeader.writeUInt16LE(DOS_DATE_1980_01_01, 14);
  centralHeader.writeUInt32LE(checksum, 16);
  centralHeader.writeUInt32LE(content.length, 20); // compressed size
  centralHeader.writeUInt32LE(content.length, 24); // uncompressed size
  centralHeader.writeUInt16LE(name.length, 28);
  // Extra field, comment, disk number and attributes stay 0, the local
  // header is at offset 0.

  const centralDirectorySize = centralHeader.length + name.length;
  const centralDirectoryOffset =
    localHeader.length + name.length + content.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8); // entries on this disk
  end.writeUInt16LE(1, 10); // entries in total
  end.writeUInt32LE(centralDirectorySize, 12);
  end.writeUInt32LE(centralDirectoryOffset, 16);

  return Buffer.concat([localHeader, name, content, centralHeader, name, end]);
}
