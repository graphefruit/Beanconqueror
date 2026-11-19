# Backup before an import

An import replaces all data in the app with the data of a backup file. Before
anything is replaced, the app writes the current data into a backup file of
its own, so the user can go back.

The implementation is split across these files:

- `src/services/uiExportImportHelper.ts`: `importBackup()` writes the file and
  then imports. Every import of a backup goes through it.
- `src/services/preImportBackup/pre-import-backup.service.ts`: file names,
  how many files are kept, the list of files.
- `src/services/preImportBackup/pre-import-backup-files.ts`: access to the
  file system, replaced in unit tests.
- `src/services/uiStorage.ts`: `import()` replaces the stored values and notes
  the import.

## When the file is written

- Settings › Import, Full import from directory (Android) and Find and import
  an automatic backup file: once the chosen file is read, the app asks
  "Replace all data with the import?" and says where the current data is
  saved. After "Yes" the file is written, then the data is replaced.
- Restoring the internal backup when the app starts: the file is written
  before the internal backup is imported, both when the app asks first
  (dialog "Data corruption found") and when it restores without asking after
  a loss of all data.

No file is written when the device stores neither settings nor entries: there
is nothing to save, and an empty file would push a real backup out of the
ones kept. If the current data cannot be read or the file cannot be written,
for example because the storage is full, nothing is imported and the app says
so. The one exception is a backup chosen because the database could not be
read at start-up (see below).

The file is written under its name with `.part` at the end and only gets its
name once it is written completely. A write that fails can leave an empty or
cut off file behind (Android creates the file before its content is written).
Such a file is never taken for a backup: it does not count as one of the
files kept, and it is not listed for an import. It is removed right away,
and again before the next backup is written, in case the app was closed while
writing.

Whether the internal backup is offered or restored at start-up is decided on
`Beanconqueror.zip` itself. Only when the database holds data and the small
summary written beside it (`Beanconqueror.zip.meta.json`, see
docs/ARCHITECTURE.md) says that the file holds no more entries than the
database is the file not read; when it does, or the summary does not
belong to the file, the file is read as before. On iOS the Files app shows
the summary beside `Beanconqueror.zip`; deleting or changing it only makes
the next start read the file.

When restoring the internal backup at start-up does not happen for that
reason, or because the import failed and was rolled back, the app says so and
keeps `Beanconqueror.zip` as it is for the rest of the session: the automatic
backups would otherwise replace it with the stored data within seconds of the
next change, so the next start can offer the restore again. The automatic
backup of the day is still written.

When the database could not be read at start-up, it is not taken for an
empty one: nothing is imported by itself and the start does not go on. The
app asks to close it and start it again, which mostly helps, or to choose a
backup (see "Going back"); `Beanconqueror.zip` comes first, as it normally
holds the newest data. `Beanconqueror.zip` is kept as it is until every
collection was read.

This is the one import that goes on without a backup of the current data:
that data cannot be read, so it cannot be saved, and the dialog says so. It
is only made for the backup chosen in that dialog, only when the current
data still cannot be read when it is read again with all attempts right
before the import, and it is logged (`Backup before import - skipped, the
current data could not be read at start-up`). When the data can be read by
then, the import is one like any other: the file is written first, and
nothing is imported when that fails. Without a copy in memory nothing can be rolled back either: when
storing the import fails, the app says that the data can be incomplete and
that no backup of it was saved, and asks again.

The file is the same ZIP an export writes. It holds no passwords, API keys or
tokens (they stay on the device, and an import keeps them) and none of the
values that belong to this installation: device id, deletion journal,
attachment manifest and the note about the last import. Like an export, it
holds the database only, no photos or flow profile files.

## Where the files are

Folder `pre-import` in the app data directory, one file per import, named
`Beanconqueror_pre_import_<YYYY-MM-DD_HH-mm-ss-SSS>Z.zip` with the time in
UTC. Unlike the local time it does not go back when the time zone changes or
daylight saving time ends, so the names sort by the time the files were
written, which tells the files to keep.

- iOS: the documents folder of the app, shown in the Files app under
  On My iPhone › Beanconqueror › pre-import.
- Android: the internal storage of the app. Neither other apps nor the file
  picker of the import can open it.

The name ends in `_imported.zip` instead when the current data is what the
last import of a file chosen in the settings stored, no entry was added,
changed or deleted since, and that file is still there as it was imported, so
it can be imported again. In doubt the name does not end in `_imported.zip`,
which only means that the file is kept longer.

Whether an entry was added, changed or deleted is told by the change info of
the entries and the deletion journal, whose times are compared with the time
of the import; settings carry no change info and do not count. These times
come from the clock of the device, so two checks that do not depend on them
are made first: the import must not lie in the future (the clock was set
back), and the number of entries must still be the one the note about the
import holds. What is not noticed: an entry that was only edited while the
clock was set back behind the import, when the clock is past the time of the
import again at the next import.

That the file can be imported again is decided by its name when the backup
is written, and not checked again later: a file the user deletes afterwards
is not noticed. It is never taken for granted for a file the app replaces or
deletes itself:

- `Beanconqueror.zip`: the name of the internal backup, which the automatic
  backups replace after every change and which the Files app shows on iOS,
  and of every export, which the next export replaces.
- The automatic backup of a day
  (`Beanconqueror_automatic_export_<DD_MM_YYYY>.zip`): it is replaced on that
  day, so it only counts when it was imported on a later day, and it can
  be deleted when the app starts a week after its day (only the eight newest
  are kept beyond that), so it no longer counts from then on. A backup
  written before that keeps its name, also once the automatic backup is
  deleted. Its data is an earlier state of the data of
  this device, which the user left again without changing it.
- One of these files (`Beanconqueror_pre_import_…`), when going back: the
  rotation after the next import can delete it, and the file written before
  that import is then the only one with that data.
- A file whose name is not known.

Data restored from the internal backup is never taken for unchanged either,
as the automatic backups replace that file.

Three files are kept: the file just written and two of the others. Of
those, the newest ones whose name does not end in `_imported.zip` come
first; a file whose name ends in `_imported.zip` is only kept while a place
is left, the newest first. Without that rule, trying a few backups one after
the other would delete the data from before the first of them: once an
import is done, the automatic backup of that day and `Beanconqueror.zip` are
written with the imported data, so this file is the only one left with the
changes made that day. The same holds when the first file tried was
`Beanconqueror.zip` or the automatic backup of the day: the data from before
it and the data of that file are both kept.

Older files are deleted once an import has completed. A failed import of a
file chosen in the settings deletes none, so the file it was started from is
still there if it fails. A restore of the internal backup at start-up that
fails deletes no older file either. The next start offers the restore again
and writes a file before it:

- It was rolled back: the file just written is deleted again and the older
  ones stay. The stored data is the same as before the restore, and a file
  written at every such start would push the older ones out after three
  starts. When the file cannot be deleted, it stays until the next completed
  import deletes older files.
- It could not be rolled back, or the database cannot be read after it was
  rolled back: no file is deleted, so one is added at every such start until
  an import completes. The first of them is the only file with the data from
  before; those of the next starts hold the mix that was left and must not
  push it out.

## When an import fails or is stopped

The current data is never left changed without a file that holds it:

- The file cannot be written, or the current data cannot be read: nothing is
  imported, the data is as it was, and no unfinished file is left.
- The question "Replace all data with the import?" is answered with "No":
  nothing is written and nothing is imported.
- Storing the imported data fails: the import writes the values from before
  back from its copy in memory, removes the keys the device did not store
  before but the backup file brought along, and says that the data was not
  changed. The stored keys and values are those from before again; values
  that belong to this installation (`LOCAL_ONLY_STORAGE_KEYS`) are neither
  written back nor removed. The file written before an import of a file
  chosen in the settings stays; the one written before a restore of the
  internal backup at start-up is deleted again (see above).
- Writing the values back or removing such a key fails as well, or the app
  is closed during the import: the stored data can be a mix of old and
  imported values. The file written before the import is complete by then,
  as nothing is replaced before it has its name, and it stays. After an
  import no file is deleted at all, also not after a failed restore of the
  internal backup. The note about the import before is removed by then
  (see below), so the file written before the next import does not end in
  `_imported.zip`. The app does not say that the data was not changed then,
  in the settings and at start-up alike: it says that the data can be
  incomplete, and that the backup from before the import is in the app
  folder "pre-import" and can be imported in the settings via "Find and
  import an automatic backup file" (`IMPORT_NOT_ROLLED_BACK`). Where no file
  was written (see below, and the backup chosen because the database could
  not be read), it says that no backup was saved instead
  (`IMPORT_NOT_ROLLED_BACK_NO_BACKUP`).

This does not hold where no file is written: in the browser, and when the
device stored neither settings nor entries.

A known limit of rolling back: the keys to remove are told by the values read
before the import. A key that something else stores for the first time while
the import is running, and that the imported file holds as well, is removed
with them. Nothing in the app is known to do so: the restore at start-up runs
before the storages are set up, and the import in the settings blocks the
screen until it is done.

## Going back

- Settings › Find and import an automatic backup file lists these files
  (`Beanconqueror_pre_import_…`) together with the automatic backups, after
  the internal `Beanconqueror.zip`, each with its date and size. Choose one
  and import it, on iOS and Android.
- On iOS the file can also be chosen in Settings › Import, in the Files app
  under On My iPhone › Beanconqueror › pre-import.

Going back is an import as well, so the data from before it is saved first
again. The data brought back is kept like data changed on the device: the
file written before the next import does not end in `_imported.zip`.

## Browser

The browser build is used for development. No file is written there: the app
has no file system in the browser (`UIFileHelper` only works on iOS and
Android), and no import could open such a file again. The import is not
stopped. It asks first and says that no backup is saved, and it still rolls
back from its copy in memory when it fails.

## Note about the last import

After a completed import the app stores this under the local key
`LAST_RESTORE` (`IRestoreNote`):

```json
{
  "last_restore_at": 1763046000000,
  "source": "import",
  "record_count": 1250,
  "file_name": "Beanconqueror_automatic_export_12_11_2026.zip"
}
```

- `last_restore_at`: milliseconds since epoch, clock of the device.
- `source`: `import` for a file chosen in the settings, `internal_backup` for
  the internal backup restored when the app starts.
- `record_count`: entries in the collections with change info (beans, brews,
  grinders, preparation methods, water, green beans, roasting machines,
  graphs, barista mode brews) once the import was stored. A collection the
  backup file does not contain is left as it is and counts as well.
- `file_name`: name of the file chosen in the settings, when it is known. It
  tells whether that file can still be imported again (see above).

The key is local to the installation: it is never written into a backup or
export, and an import never takes it from a file. The previous note is
removed before the data is replaced, so it is never taken for a note about
other data when the app is closed during the import or the new note cannot
be stored. An import that was rolled back stores the previous note again.

No entry is marked as imported. The imported entries keep the change info they
came with (`created_at`, `updated_at`, `rev`, `updated_by`), so they never look
like changes made on this device. A mark on every entry would stay until the
entry is edited again, and adding or removing it would mean writing whole
collections.
