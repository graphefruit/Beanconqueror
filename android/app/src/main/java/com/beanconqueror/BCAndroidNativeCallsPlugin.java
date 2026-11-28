package com.beanconqueror;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Log;
import android.view.View;
import android.webkit.MimeTypeMap;

import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@CapacitorPlugin(name = "BCAndroidNativeCalls")
public class BCAndroidNativeCallsPlugin extends Plugin {
  private static final String TAG = BCAndroidNativeCallsPlugin.class.getSimpleName();

  @PluginMethod()
  public void pickDirectory(PluginCall call) {
    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
    startActivityForResult(call, intent, "pickDirectoryResult");
  }

  @ActivityCallback
  private void pickDirectoryResult(PluginCall call, ActivityResult activityResult) {
    if (call == null) {
      return;
    }

    if (activityResult.getResultCode() != Activity.RESULT_OK) {
      call.reject("Intent result was not OK, got result " + activityResult.getResultCode());
      return;
    }
    if (activityResult.getData() == null) {
      call.reject("Intent result data was null");
      return;
    }
    Uri uri = activityResult.getData().getData();
    if (uri == null) {
      call.reject("Intent result uri was null");
      return;
    }

    boolean takePersistentPermissions = call.getBoolean("takePersistentPermissions", false);
    if (takePersistentPermissions) {
      final int takeFlags =
        Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
      getContext().getContentResolver().takePersistableUriPermission(uri, takeFlags);
    }

    JSObject result = new JSObject();
    result.put("safTreeUri", uri.toString());
    call.resolve(result);
  }

  /**
   * The edge-to-edge plugin keeps the WebView clear of a display cutout with a margin but only
   * colours the status and navigation bar, so the strip beside the cutout shows what lies behind
   * the WebView. The web app paints it in its page colour whenever its theme changes. The WebView
   * parent is used rather than the window background, which the system splash screen resets to
   * the theme's value when it hides.
   */
  @PluginMethod()
  public void setBackgroundColor(PluginCall call) {
    String color = call.getString("color");
    if (color == null) {
      call.reject("color was null");
      return;
    }
    int parsedColor;
    try {
      parsedColor = Color.parseColor(color);
    } catch (IllegalArgumentException ex) {
      call.reject("color is not a valid colour", ex);
      return;
    }
    getActivity().runOnUiThread(() -> {
      ((View) getBridge().getWebView().getParent()).setBackgroundColor(parsedColor);
      call.resolve();
    });
  }

  @PluginMethod()
  public void fileExistsSaf(PluginCall call) {
    String safTreeUriStr = call.getString("safTreeUri");
    if (safTreeUriStr == null) {
      call.reject("safTreeUri was null");
      return;
    }
    Uri safTreeUri = Uri.parse(safTreeUriStr);

    List<String> pathComponents;
    try {
      pathComponents = call.getArray("pathComponents").toList();
    } catch (JSONException ex) {
      call.reject("Cannot extract pathComponents", ex);
      return;
    }

    DocumentFile safTreeFile = DocumentFile.fromTreeUri(getContext(), safTreeUri);
    if (safTreeFile == null) {
      call.reject("safTreeFile created from safTreeUri was null.");
      return;
    }

    DocumentFile currentFile = safTreeFile;
    for (int i = 0; i < pathComponents.size(); i++) {
      boolean isLastComponent = i == (pathComponents.size() - 1);
      String component = pathComponents.get(i);
      DocumentFile nextFile = currentFile.findFile(component);
      if (nextFile == null) {
        Log.d(TAG, "Could not find path component " + component + " at pathComponents[" + i + "]");
        JSObject result = new JSObject();
        result.put("exists", false);
        call.resolve(result);
        return;
      }
      if (!isLastComponent && !nextFile.isDirectory()) {
        call.reject("Intermediate path component " + component + " at pathComponents[" + i +
          "] is not a directory.");
        return;
      }
      currentFile = nextFile;
    }

    boolean exists = currentFile.exists();

    JSObject result = new JSObject();
    result.put("exists", exists);
    call.resolve(result);
  }

  @PluginMethod
  public void copySafDirectoryToFileDirectory(PluginCall call) {
    String fromSafTreeUriStr = call.getString("fromSafTreeUri");
    String toDirectoryUriStr = call.getString("toDirectoryUri");

    if (fromSafTreeUriStr == null) {
      call.reject("fromSafTreeUri was null");
      return;
    }
    if (toDirectoryUriStr == null) {
      call.reject("toDirectoryUri was null");
      return;
    }

    Uri fromSafTreeUri = Uri.parse(fromSafTreeUriStr);
    Uri toDirectoryUri = Uri.parse(toDirectoryUriStr);
    File targetFile = new File(toDirectoryUri.getPath());
    Log.d(TAG, "Got request to copy " + fromSafTreeUri + " to " + toDirectoryUri + "(resolved to" +
      targetFile + ")");

    DocumentFile fromSafTree = DocumentFile.fromTreeUri(getContext(), fromSafTreeUri);

    try {
      copySafDirectoryToFileDirectoryRecursive(fromSafTree, targetFile);
      call.resolve();
    } catch (IOException e) {
      Log.e(TAG, "Error while copying directory from SAF.", e);
      call.reject("An error occurred while copying", e);
    }
  }

  private void copySafDirectoryToFileDirectoryRecursive(DocumentFile safDir, File targetDir)
    throws IOException {
    for (DocumentFile src : safDir.listFiles()) {
      File target = new File(targetDir, src.getName());
      if (src.isDirectory()) {
        // create the target directory first, then recurse
        Log.d(TAG, "Creating target directory " + target);
        target.mkdirs();
        copySafDirectoryToFileDirectoryRecursive(src, target);
        continue;
      }

      // src is a file, copy it manually
      Log.d(TAG, "Copying SAF file " + src.getUri() + " to " + target);
      try (InputStream srcStream = getContext().getContentResolver().openInputStream(src.getUri());
           OutputStream targetStream = new FileOutputStream(target)) {
        this.transferStream(srcStream, targetStream);
      }
    }
  }

  @PluginMethod
  public void moveFileDirectoryToSafDirectory(PluginCall call) {
    String fromDirectoryUriStr = call.getString("fromDirectoryUri");
    String toSafTreeUriStr = call.getString("toSafTreeUri");

    if (fromDirectoryUriStr == null) {
      call.reject("fromDirectoryUri was null");
      return;
    }
    if (toSafTreeUriStr == null) {
      call.reject("toSafTreeUri was null");
      return;
    }

    Uri toSafTreeUri = Uri.parse(toSafTreeUriStr);
    Uri fromDirectoryUri = Uri.parse(fromDirectoryUriStr);
    File fromDirectory = new File(fromDirectoryUri.getPath());
    Log.d(TAG, "Got request to move " + fromDirectoryUri + "(resolved to" + fromDirectory + "to " +
      toSafTreeUri);

    try {
      this.writeExportToSaf(fromDirectory, toSafTreeUri, call);
    } catch (IOException | RuntimeException e) {
      Log.e(TAG, "Error while moving directory to SAF.", e);
      call.reject("An error occurred while moving", e);
    }
  }

  /**
   * Writes the files of srcDir into the SAF folder as SafExportPlan says and
   * deletes each one after it was written.
   */
  private void writeExportToSaf(File srcDir, Uri treeUri, PluginCall call)
    throws IOException {
    ContentResolver resolver = getContext().getContentResolver();
    Uri root = DocumentsContract.buildDocumentUriUsingTree(
      treeUri, DocumentsContract.getTreeDocumentId(treeUri));
    Map<String, Uri> folders = new HashMap<>();
    folders.put("", root);
    List<String> files = new ArrayList<>();
    Map<String, Uri> taken = new HashMap<>();
    Map<String, Uri> rootChildren = scanSaf(srcDir, "", root, treeUri, folders, files, taken);

    Uri marker = rootChildren.get(SafExportPlan.MARKER_NAME);
    Set<String> marked = new HashSet<>();
    if (marker != null) {
      try (BufferedReader reader = new BufferedReader(
        new InputStreamReader(open(resolver.openInputStream(marker)), StandardCharsets.UTF_8))) {
        String line;
        while ((line = reader.readLine()) != null) {
          marked.add(line);
        }
      }
    }
    SafExportPlan plan = SafExportPlan.of(files, taken.keySet(), marked, "Beanconqueror.zip");
    if (plan.conflict != null) {
      JSObject data = new JSObject();
      data.put("fileName", plan.conflict);
      call.reject("File exists already: " + plan.conflict, "FILE_EXISTS", null, data);
      return;
    }

    // "wt" truncates a file written over; a new one is opened as before,
    // because not every provider takes "wt".
    String markerMode = marker == null ? "w" : "wt";
    if (marker == null) {
      marker = create(resolver, root, "text/plain", SafExportPlan.MARKER_NAME);
    }
    try (OutputStream out = open(resolver.openOutputStream(marker, markerMode))) {
      out.write(String.join("\n", plan.marked).getBytes(StandardCharsets.UTF_8));
    }

    for (String path : plan.order) {
      int slash = path.lastIndexOf('/');
      String name = path.substring(slash + 1);
      Uri target = taken.get(path);
      String mode = target == null ? "w" : "wt";
      if (target == null) {
        Uri parent = folder(resolver, folders, slash < 0 ? "" : path.substring(0, slash));
        String mimeType = MimeTypeMap.getSingleton()
          .getMimeTypeFromExtension(name.substring(name.lastIndexOf('.') + 1).toLowerCase());
        target = create(resolver, parent, mimeType == null ? "application/octet-stream" : mimeType, name);
      }
      File src = new File(srcDir, path);
      Log.d(TAG, "Moving file " + src + " to SAF file " + target);
      try (InputStream in = new FileInputStream(src);
           OutputStream out = open(resolver.openOutputStream(target, mode))) {
        this.transferStream(in, out);
      }
      src.delete();
    }
    DocumentsContract.deleteDocument(resolver, marker);
    call.resolve();
  }

  /**
   * Lists the files of srcDir (relative to the export root) into files, and
   * into taken those the SAF folder has already, or whose folder is a file
   * there. Returns the children of targetDir.
   */
  private Map<String, Uri> scanSaf(
    File srcDir, String prefix, Uri targetDir, Uri treeUri,
    Map<String, Uri> folders, List<String> files, Map<String, Uri> taken) {
    Map<String, Uri> children = new HashMap<>();
    Set<String> childFolders = new HashSet<>();
    if (targetDir != null) {
      Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(
        treeUri, DocumentsContract.getDocumentId(targetDir));
      try (Cursor cursor = getContext().getContentResolver().query(childrenUri, new String[]{
        DocumentsContract.Document.COLUMN_DOCUMENT_ID,
        DocumentsContract.Document.COLUMN_DISPLAY_NAME,
        DocumentsContract.Document.COLUMN_MIME_TYPE}, null, null, null)) {
        while (cursor != null && cursor.moveToNext()) {
          String name = cursor.getString(1);
          children.put(name, DocumentsContract.buildDocumentUriUsingTree(treeUri, cursor.getString(0)));
          if (DocumentsContract.Document.MIME_TYPE_DIR.equals(cursor.getString(2))) {
            childFolders.add(name);
          }
        }
      }
    }
    File[] srcFiles = srcDir.listFiles();
    if (srcFiles == null) {
      return children;
    }
    for (File src : srcFiles) {
      String path = prefix + src.getName();
      Uri there = children.get(src.getName());
      if (src.isDirectory()) {
        boolean isFolder = childFolders.contains(src.getName());
        if (there != null && !isFolder) {
          taken.put(path, there);
        }
        if (isFolder) {
          folders.put(path, there);
        }
        scanSaf(src, path + "/", isFolder ? there : null, treeUri, folders, files, taken);
      } else {
        files.add(path);
        if (there != null) {
          taken.put(path, there);
        }
      }
    }
    return children;
  }

  /** The SAF folder at path, created with its parents where they are missing. */
  private Uri folder(ContentResolver resolver, Map<String, Uri> folders, String path)
    throws IOException {
    Uri known = folders.get(path);
    if (known != null) {
      return known;
    }
    int slash = path.lastIndexOf('/');
    Uri parent = folder(resolver, folders, slash < 0 ? "" : path.substring(0, slash));
    Uri created = create(resolver, parent, DocumentsContract.Document.MIME_TYPE_DIR,
      path.substring(slash + 1));
    folders.put(path, created);
    return created;
  }

  private static Uri create(ContentResolver resolver, Uri parent, String mimeType, String name)
    throws IOException {
    Uri created = DocumentsContract.createDocument(resolver, parent, mimeType, name);
    if (created == null) {
      throw new IOException("Could not create " + name);
    }
    return created;
  }

  private static <T> T open(T stream) throws IOException {
    if (stream == null) {
      throw new IOException("The storage provider did not open the file");
    }
    return stream;
  }

  private void transferStream(InputStream in, OutputStream out) throws IOException {
    byte[] buffer = new byte[8192];
    int bytesRead;
    while ((bytesRead = in.read(buffer)) != -1) {
      out.write(buffer, 0, bytesRead);
    }
  }
}
