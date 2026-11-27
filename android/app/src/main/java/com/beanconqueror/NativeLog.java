package com.beanconqueror;

import android.app.ActivityManager;
import android.app.ApplicationExitInfo;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.os.Process;
import android.os.SystemClock;
import android.util.Log;

import androidx.annotation.RequiresApi;
import androidx.core.content.pm.PackageInfoCompat;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Copies the native output of the BLE plugin, our own plugin and crashes from logcat into
 * rotating files next to the JS log (filesDir/logs), so it survives restarts and can be shared.
 */
public final class NativeLog {
  static final String TAG = "BeanConqueror";
  // Not on the logcat allow list, so warnings about the log itself never end up in it.
  private static final String OWN_TAG = "NativeLog";
  static final long MAX_BYTES = 1024 * 1024;
  static final int KEEP_FILES = 3;
  static final Pattern FILE_NAME = Pattern.compile("^native_\\d{8}_\\d{9}\\.log$");
  // Per packet, per scan result or per heartbeat (scales write about once a second).
  private static final String[] NOISE = {
    "onCharacteristicChanged", "onCharacteristicRead", "onCharacteristicWrite", "Queuing Command",
    "Processing Command", "Processing Complete", "Command Queue is empty", "--------- beginning of",
    "Peripheral: Read ", "Peripheral: Write ", "BLEPlugin: Scan Result", "BLEPlugin: action = read",
    "BLEPlugin: action = write",
  };
  private static final long[] RESTART_DELAYS_MS = {1000, 5000, 30000};
  private static boolean started;

  private NativeLog() {}

  public static synchronized void start(Context context) {
    if (started) {
      return;
    }
    started = true;
    Context app = context.getApplicationContext();
    Thread thread = new Thread(() -> run(app), OWN_TAG);
    thread.setDaemon(true);
    thread.start();
  }

  private static void run(Context app) {
    SharedPreferences prefs = app.getSharedPreferences("native_log", Context.MODE_PRIVATE);
    try {
      PackageInfo info = app.getPackageManager().getPackageInfo(app.getPackageName(), 0);
      Log.i(TAG, "start " + info.versionName + " (" + PackageInfoCompat.getLongVersionCode(info) + ") Android " + Build.VERSION.SDK_INT);
      if (Build.VERSION.SDK_INT >= 30) {
        logExitReasons(app, prefs);
      }
    } catch (Exception e) {
      Log.w(OWN_TAG, "start info failed", e);
    }
    Sink sink = new Sink(new File(app.getFilesDir(), "logs"));
    for (int attempt = 0; ; attempt++) {
      try {
        follow(prefs, sink);
      } catch (Exception e) {
        Log.w(OWN_TAG, "logcat failed", e);
      }
      sink.close();
      if (attempt >= RESTART_DELAYS_MS.length) {
        return;
      }
      SystemClock.sleep(RESTART_DELAYS_MS[attempt]);
    }
  }

  @RequiresApi(30)
  private static void logExitReasons(Context app, SharedPreferences prefs) {
    ActivityManager am = (ActivityManager) app.getSystemService(Context.ACTIVITY_SERVICE);
    List<ApplicationExitInfo> exits = am.getHistoricalProcessExitReasons(app.getPackageName(), 0, 5);
    long last = prefs.getLong("lastExit", 0);
    long newest = last;
    // Newest first; logged oldest first so the file reads in order.
    for (int i = exits.size() - 1; i >= 0; i--) {
      ApplicationExitInfo exit = exits.get(i);
      // The WebView's sandbox processes report their own exits under our package.
      if (exit.getTimestamp() > last && app.getPackageName().equals(exit.getProcessName())) {
        Log.println(exitLevel(exit.getReason()), TAG, "exit " + exit);
        newest = Math.max(newest, exit.getTimestamp());
      }
    }
    prefs.edit().putLong("lastExit", newest).apply();
  }

  private static void follow(SharedPreferences prefs, Sink sink) throws IOException {
    long processStart = System.currentTimeMillis() - (SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime());
    java.lang.Process logcat = new ProcessBuilder(
      "logcat", "-b", "main,crash", "-v", "threadtime,year,zone", "-T", logcatTime(prefs.getLong("lastLine", processStart)),
      "BLEPlugin:V", "Peripheral:V", "L2CAPContext:V", "BCAndroidNativeCallsPlugin:V", TAG + ":V", "AndroidRuntime:E", "*:S"
    ).redirectErrorStream(true).start();
    try (BufferedReader reader = new BufferedReader(new InputStreamReader(logcat.getInputStream(), StandardCharsets.UTF_8))) {
      long lastLine = 0;
      String line;
      while ((line = reader.readLine()) != null) {
        if (isNoise(line)) {
          continue;
        }
        try {
          sink.write(line, System.currentTimeMillis());
          lastLine = Math.max(lastLine, lineTime(line));
          if (!reader.ready()) {
            sink.flush();
            if (lastLine > 0) {
              // +1 ms: logcat -T is inclusive and would repeat the last line on every start.
              prefs.edit().putLong("lastLine", lastLine + 1).apply();
            }
          }
        } catch (IOException e) {
          Log.w(OWN_TAG, "write failed: " + e);
        }
      }
    } finally {
      logcat.destroy();
    }
  }

  static boolean isNoise(String line) {
    for (String noise : NOISE) {
      if (line.contains(noise)) {
        return true;
      }
    }
    return false;
  }

  static int exitLevel(int reason) {
    switch (reason) {
      case ApplicationExitInfo.REASON_CRASH:
      case ApplicationExitInfo.REASON_CRASH_NATIVE:
      case ApplicationExitInfo.REASON_ANR:
      case ApplicationExitInfo.REASON_LOW_MEMORY:
        return Log.ERROR;
      default:
        return Log.INFO;
    }
  }

  static String logcatTime(long millis) {
    return String.format(Locale.ROOT, "%d.%03d", millis / 1000, millis % 1000);
  }

  /** Time of a `threadtime,year,zone` line, e.g. "2026-11-26 10:15:03.123 +0100 ...", or 0. */
  static long lineTime(String line) {
    try {
      Date date = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS Z", Locale.ROOT).parse(line.substring(0, 29));
      return date == null ? 0 : date.getTime();
    } catch (ParseException | IndexOutOfBoundsException e) {
      return 0;
    }
  }

  /** Appends lines to native_*.log: a new file per day and per MAX_BYTES, keeping the newest KEEP_FILES. */
  static final class Sink {
    private final File dir;
    private Writer writer;
    private String day;
    private long bytes;
    private boolean failed;

    Sink(File dir) {
      this.dir = dir;
    }

    void write(String line, long now) throws IOException {
      String today = new SimpleDateFormat("yyyyMMdd", Locale.ROOT).format(new Date(now));
      if (writer == null || bytes >= MAX_BYTES || !today.equals(day)) {
        open(now, today);
      }
      try {
        writer.write(line);
        writer.write('\n');
        bytes += line.getBytes(StandardCharsets.UTF_8).length + 1;
      } catch (IOException e) {
        fail();
        throw e;
      }
    }

    void flush() throws IOException {
      if (writer != null) {
        try {
          writer.flush();
        } catch (IOException e) {
          fail();
          throw e;
        }
      }
    }

    void close() {
      if (writer != null) {
        try {
          writer.close();
        } catch (IOException e) {
          Log.w(OWN_TAG, "close failed", e);
        }
        writer = null;
      }
    }

    /** The file that failed may stay broken, so the next line goes to a new one. */
    private void fail() {
      close();
      failed = true;
    }

    private void open(long now, String today) throws IOException {
      close();
      if (!dir.isDirectory() && !dir.mkdirs()) {
        throw new IOException("cannot create " + dir);
      }
      String[] names = nativeFiles();
      File file = names.length > 0 ? new File(dir, names[names.length - 1]) : null;
      if (file == null || failed || !file.getName().startsWith("native_" + today) || file.length() >= MAX_BYTES) {
        file = new File(dir, "native_" + new SimpleDateFormat("yyyyMMdd_HHmmssSSS", Locale.ROOT).format(new Date(now)) + ".log");
      }
      failed = true;
      writer = new BufferedWriter(new OutputStreamWriter(new FileOutputStream(file, true), StandardCharsets.UTF_8));
      failed = false;
      day = today;
      bytes = file.length();
      String[] all = nativeFiles();
      for (int i = 0; i < all.length - KEEP_FILES; i++) {
        new File(dir, all[i]).delete();
      }
    }

    private String[] nativeFiles() {
      String[] names = dir.list((d, name) -> FILE_NAME.matcher(name).matches());
      names = names == null ? new String[0] : names;
      Arrays.sort(names);
      return names;
    }
  }
}
