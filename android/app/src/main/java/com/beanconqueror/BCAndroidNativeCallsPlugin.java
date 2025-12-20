package com.beanconqueror;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.webkit.MimeTypeMap;

import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;

import android.view.Window;
import android.view.WindowInsets;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.ViewGroup;
import android.view.Gravity;
import android.widget.FrameLayout;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;

@CapacitorPlugin(name = "BCAndroidNativeCalls")
public class BCAndroidNativeCallsPlugin extends Plugin {
  private static final String TAG = BCAndroidNativeCallsPlugin.class.getSimpleName();

  @PluginMethod()
  public void setStatusBarColor(PluginCall call) {
    if (Build.VERSION.SDK_INT >= 35) {
      String colorStr = call.getString("color");
      if (colorStr == null) {
        call.reject("color was null");
        return;
      }
      int color = Color.parseColor(colorStr);

      getActivity().runOnUiThread(() -> {
        Window window = getActivity().getWindow();
        // Use android.R.id.content to find the container where the WebView lives
        // This is safer than DecorView for "content-level" overlays
        ViewGroup contentView = window.findViewById(android.R.id.content);

        contentView.setOnApplyWindowInsetsListener((view, insets) -> {
          android.graphics.Insets statusBarInsets = insets.getInsets(WindowInsets.Type.statusBars());
          int statusBarHeight = statusBarInsets.top;
          
          // 1. Find or create the overlay view
          View overlayView = contentView.findViewWithTag("customStatusBarOverlay");
          if (overlayView == null) {
            overlayView = new View(getActivity());
            overlayView.setTag("customStatusBarOverlay");
            contentView.addView(overlayView);
          }

          // 2. Position it at the top with correct height
          // Note: If contentView is FrameLayout, we use FrameLayout.LayoutParams
          if (overlayView.getLayoutParams() instanceof FrameLayout.LayoutParams) {
             FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) overlayView.getLayoutParams();
             params.width = FrameLayout.LayoutParams.MATCH_PARENT;
             params.height = statusBarHeight;
             params.gravity = Gravity.TOP;
             overlayView.setLayoutParams(params);
          } else {
             // Fallback if not set yet or different param type
             FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, 
                statusBarHeight
             );
             params.gravity = Gravity.TOP;
             overlayView.setLayoutParams(params);
          }
          
          overlayView.setBackgroundColor(color);
          overlayView.bringToFront();

          // 3. Return INSETS UNMODIFIED
          // This ensures Ionic/WebView receives the insets and applies the Safe Area padding internally.
          // Since our overlay sits in that "Safe Area" (0..50px), it acts as the background.
          return insets;
        });
        
        // Trigger immediate update if view exists
        View existingOverlay = contentView.findViewWithTag("customStatusBarOverlay");
        if (existingOverlay != null) {
            existingOverlay.setBackgroundColor(color);
        }

        call.resolve();
      });
    } else {
      String colorStr = call.getString("color");
      if (colorStr == null) {
        call.reject("color was null");
        return;
      }
      int color = Color.parseColor(colorStr);
      getActivity().runOnUiThread(() -> {
        Window window = getActivity().getWindow();
        window.setStatusBarColor(color);
        call.resolve();
      });
    }
  }

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

    DocumentFile toSafTree = DocumentFile.fromTreeUri(getContext(), toSafTreeUri);

    try {
      this.moveFileDirectoryToSafDirectoryRecursive(fromDirectory, toSafTree);
      call.resolve();
    } catch (IOException e) {
      Log.e(TAG, "Error while moving directory to SAF.", e);
      call.reject("An error occurred while moving", e);
    }
  }

  private void moveFileDirectoryToSafDirectoryRecursive(File srcDir, DocumentFile targetSafDir)
    throws IOException {
    for (File src : srcDir.listFiles()) {
      if (src.isDirectory()) {
        // create the target directory first, then recurse
        String dirName = src.getName();
        Log.d(TAG,
          "Creating target directory " + dirName + " in SAF directory " + targetSafDir.getUri());
        DocumentFile targetDir = targetSafDir.createDirectory(dirName);
        moveFileDirectoryToSafDirectoryRecursive(src, targetDir);
        // after the directory was copied, delete it
        src.delete();
        continue;
      }

      // src is a file, copy it manually
      // First we need to create the target file, which for some reason needs a MIME type
      Uri srcUri = Uri.fromFile(src);
      String fileExtension = MimeTypeMap.getFileExtensionFromUrl(srcUri.toString());
      String mimeType =
        MimeTypeMap.getSingleton().getMimeTypeFromExtension(fileExtension);
      DocumentFile target = targetSafDir.createFile(mimeType, src.getName());
      Log.d(TAG, "Moving file " + src + " to SAF file " + target.getUri());

      try (InputStream srcStream = new FileInputStream(src);
           OutputStream targetStream = getContext().getContentResolver()
                                                   .openOutputStream(target.getUri())) {
        this.transferStream(srcStream, targetStream);
      }
      // After we're done, delete the src file
      src.delete();
    }
  }

  private void transferStream(InputStream in, OutputStream out) throws IOException {
    byte[] buffer = new byte[8192];
    int bytesRead;
    while ((bytesRead = in.read(buffer)) != -1) {
      out.write(buffer, 0, bytesRead);
    }
  }
}
