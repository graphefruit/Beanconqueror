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
so.

When restoring the internal backup at start-up does not happen for that
reason, or because the import failed and was rolled back, the app says so and
keeps `Beanconqueror.zip` as it is for the rest of the session: the automatic
backups would otherwise replace it with the stored data within seconds of the
next change, so the next start can offer the restore again. The automatic
backup of the day is still written.

The file is the same ZIP an export writes. It holds no passwords, API keys or
tokens (they stay on the device, and an import keeps them) and none of the
values that belong to this installation: device id, deletion journal,
attachment manifest and the note about the last import. Like an export, it
holds the database only, no photos or flow profile files.

## Where the files are

Folder `pre-import` in the app data directory, one file per import, named
`Beanconqueror_pre_import_<YYYY-MM-DD_HH-mm-ss-SSS>.zip` in local time.

- iOS: the documents folder of the app, shown in the Files app under
  On My iPhone › Beanconqueror › pre-import.
- Android: the internal storage of the app. Neither other apps nor the file
  picker of the import can open it.

The name ends in `_imported.zip` instead when the current data is what the
last import of a file chosen in the settings stored, no entry was added,
changed or deleted since (told by the change info of the entries and the
deletion journal; settings carry no change info and do not count), and that
file is still there as it was imported, so it can be imported again. That is
never taken for granted for a file the app replaces or deletes itself:

- `Beanconqueror.zip`: the name of the internal backup, which the automatic
  backups replace after every change and which the Files app shows on iOS,
  and of every export, which the next export replaces.
- The automatic backup of a day
  (`Beanconqueror_automatic_export_<DD_MM_YYYY>.zip`): it is replaced on that
  day, so it only counts when it was imported on a later day, and it is
  deleted when the app starts a week after its day.
- One of these files (`Beanconqueror_pre_import_…`), when going back: the
  rotation after the next import can delete it, and the file written before
  that import is then the only one with that data.
- A file whose name is not known.

Data restored from the internal backup is never taken for unchanged either,
as the automatic backups replace that file.

Three files are kept. When the name of the file just written ends in
`_imported.zip`: that file, the newest one whose name does not end in
`_imported.zip`, and the newest of the others. Otherwise the three newest.
Older ones are deleted once an import has completed. A failed import of a
file chosen in the settings deletes none, so the file it was started from is
still there if it fails. A failed restore of the internal backup at start-up
deletes older ones as well: `Beanconqueror.zip` is not one of these files, and
the next start offers the restore again and writes a file before it, so
without that a restore failing at every start would add one at every start.

Without that rule, trying a few backups one after the other would delete the
data from before the first of them: once an import is done, the automatic
backup of that day and `Beanconqueror.zip` are written with the imported
data, so this file is the only one left with the changes made that day.

## Going back

- Settings › Find and import an automatic backup file lists these files
  (`Beanconqueror_pre_import_…`) together with the automatic backups. Choose
  one and import it, on iOS and Android.
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
- `record_count`: entries the import stored in the collections with change
  info (beans, brews, grinders, preparation methods, water, green beans,
  roasting machines, graphs, barista mode brews).
- `file_name`: name of the file chosen in the settings, when it is known. It
  tells whether that file can still be imported again (see above).

The key is local to the installation: it is never written into a backup or
export, and an import never takes it from a file. An import that was rolled
back leaves the previous note.

No entry is marked as imported. The imported entries keep the change info they
came with (`created_at`, `updated_at`, `rev`, `updated_by`), so they never look
like changes made on this device. A mark on every entry would stay until the
entry is edited again, and adding or removing it would mean writing whole
collections.
