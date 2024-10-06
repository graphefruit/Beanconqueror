import { registerPlugin } from '@capacitor/core';

export interface PickDirectoryOptions {
  /**
   * Determines if persistent permissions to the picked directory should be
   * requested. If this is not done, the access only persists until the device
   * restarts.
   */
  takePersistentPermissions?: boolean;
}

export interface FileExistsSafOptions {
  /**
   * The Android SAF Tree URI to use as the root directory to resolve the path
   * components from.
   * Use {@link BCAndroidNativeCalls.pickDirectory pickDirectory} to get a
   * suitable safTreeUri.
   */
  safTreeUri: string;

  /**
   * The path components describing the file to check the existence of.
   *
   * @example
   * // describes the path 'my/dir/and/filename.txt'
   * ['my', 'dir', 'and', 'filename.txt']
   */
  pathComponents: string[];
}

export interface CopySafDirectoryToFileDirectoryOptions {
  /**
   * The Android SAF Tree URI to copy all files recursively from.
   * Use {@link BCAndroidNativeCalls.pickDirectory pickDirectory} to get a
   * suitable safTreeUri.
   */
  fromSafTreeUri: string;

  /**
   * The directory URI to copy all files recursively to. This should be a
   * file: URI and the directory should already exist.
   */
  toDirectoryUri: string;
}

export interface CopyFileDirectoryToSafDirectoryOptions {
  /**
   * The directory URI to copy all files recursively from. This should be a
   * file: URI and the directory should already exist.
   */
  fromDirectoryUri: string;

  /**
   * The Android SAF Tree URI to copy all files recursively to.
   * Use {@link BCAndroidNativeCalls.pickDirectory pickDirectory} to get a
   * suitable safTreeUri.
   */
  toSafTreeUri: string;
}

export interface BCAndroidNativeCalls {
  /**
   * Start a directory picker for a directory that the application will then
   * get access to. Depending on the options, the access will be short-lived
   * or permanent.
   */
  pickDirectory(options: PickDirectoryOptions): Promise<{ safTreeUri: string }>;

  /**
   * Check whether the file identified by the given options exists in a SAF
   * content provider.
   */
  fileExistsSaf(options: FileExistsSafOptions): Promise<{ exists: boolean }>;

  /**
   * Copy a SAF directory recursively to a File-based internal directory.
   */
  copySafDirectoryToFileDirectory(
    options: CopySafDirectoryToFileDirectoryOptions
  ): Promise<void>;

  /**
   * Move an internal File-based directory to a SAF directory. Note that the
   * internal directory contents will be deleted!
   */
  moveFileDirectoryToSafDirectory(
    options: CopyFileDirectoryToSafDirectoryOptions
  ): Promise<void>;
}

const AndroidNativeCalls = registerPlugin<BCAndroidNativeCalls>(
  'BCAndroidNativeCalls'
);

export { AndroidNativeCalls };
