package com.beanconqueror;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import android.app.ApplicationExitInfo;
import android.util.Log;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Locale;

public class NativeLogTest {
  @Rule public TemporaryFolder tmp = new TemporaryFolder();

  private static long at(int day, int hour) {
    Calendar calendar = Calendar.getInstance();
    calendar.clear();
    calendar.set(2026, Calendar.NOVEMBER, day, hour, 0, 0);
    return calendar.getTimeInMillis();
  }

  private String[] nativeFiles(File dir) {
    String[] names = dir.list((d, name) -> NativeLog.FILE_NAME.matcher(name).matches());
    Arrays.sort(names);
    return names;
  }

  @Test
  public void namesFilesByCreationTime() throws IOException {
    File dir = new File(tmp.getRoot(), "logs");
    NativeLog.Sink sink = new NativeLog.Sink(dir);
    sink.write("a", at(26, 10));
    sink.close();

    String expected = "native_" + new SimpleDateFormat("yyyyMMdd_HHmmssSSS", Locale.ROOT).format(at(26, 10)) + ".log";
    assertArrayEquals(new String[] {expected}, nativeFiles(dir));
    assertEquals("a\n", new String(Files.readAllBytes(new File(dir, expected).toPath()), StandardCharsets.UTF_8));
  }

  @Test
  public void startsNewFileOnNewDay() throws IOException {
    File dir = tmp.getRoot();
    NativeLog.Sink sink = new NativeLog.Sink(dir);
    sink.write("a", at(25, 23));
    sink.write("b", at(26, 0));
    sink.close();

    assertEquals(2, nativeFiles(dir).length);
  }

  @Test
  public void appendsToTodaysFileAfterRestart() throws IOException {
    File dir = tmp.getRoot();
    NativeLog.Sink first = new NativeLog.Sink(dir);
    first.write("a", at(26, 10));
    first.close();
    NativeLog.Sink second = new NativeLog.Sink(dir);
    second.write("b", at(26, 11));
    second.close();

    String[] names = nativeFiles(dir);
    assertEquals(1, names.length);
    assertEquals("a\nb\n", new String(Files.readAllBytes(new File(dir, names[0]).toPath()), StandardCharsets.UTF_8));
  }

  @Test
  public void startsNewFileAboveMaxBytes() throws IOException {
    File dir = tmp.getRoot();
    char[] chunk = new char[64 * 1024];
    Arrays.fill(chunk, 'x');
    NativeLog.Sink sink = new NativeLog.Sink(dir);
    for (int i = 0; i < 16; i++) {
      sink.write(new String(chunk), at(26, 10));
    }
    sink.write("next", at(26, 11));
    sink.close();

    String[] names = nativeFiles(dir);
    assertEquals(2, names.length);
    assertEquals(5, new File(dir, names[1]).length());
  }

  @Test
  public void startsNewFileAfterWriteFailure() throws IOException {
    File dir = tmp.getRoot();
    File broken = new File(dir, "native_20261126_090000000.log");
    assertTrue(broken.mkdir());
    NativeLog.Sink sink = new NativeLog.Sink(dir);
    try {
      sink.write("lost", at(26, 10));
      fail("expected the broken file to fail");
    } catch (IOException expected) {
      // The sink rethrows so the caller can report it.
    }
    sink.write("kept", at(26, 10));
    sink.close();

    String[] names = nativeFiles(dir);
    assertEquals(2, names.length);
    assertEquals("kept\n", new String(Files.readAllBytes(new File(dir, names[1]).toPath()), StandardCharsets.UTF_8));
  }

  @Test
  public void countsBytesNotCharacters() throws IOException {
    File dir = tmp.getRoot();
    char[] chunk = new char[32 * 1024];
    Arrays.fill(chunk, '\u00e4');
    NativeLog.Sink sink = new NativeLog.Sink(dir);
    for (int i = 0; i < 16; i++) {
      sink.write(new String(chunk), at(26, 10));
    }
    sink.write("next", at(26, 11));
    sink.close();

    assertEquals(2, nativeFiles(dir).length);
  }

  @Test
  public void keepsOnlyNewestNativeFilesAndLeavesJsLogs() throws IOException {
    File dir = tmp.getRoot();
    File jsLog = new File(dir, "log_20261101_100000000.jsonl");
    assertTrue(jsLog.createNewFile());
    NativeLog.Sink sink = new NativeLog.Sink(dir);
    for (int day = 20; day <= 25; day++) {
      sink.write("day " + day, at(day, 10));
    }
    sink.close();

    String[] names = nativeFiles(dir);
    assertEquals(NativeLog.KEEP_FILES, names.length);
    assertTrue(names[0].startsWith("native_20261123"));
    assertTrue(jsLog.exists());
  }

  @Test
  public void dropsBlePacketNoiseButKeepsConnectionLines() {
    assertTrue(NativeLog.isNoise("2026-11-26 10:15:03.123 +0100  1234  1250 D Peripheral: onCharacteristicChanged 0000ffe1"));
    assertTrue(NativeLog.isNoise("2026-11-26 10:15:03.123 +0100  1234  1250 D Peripheral: Queuing Command Write"));
    assertTrue(NativeLog.isNoise("--------- beginning of main"));
    assertTrue(NativeLog.isNoise("2026-11-26 10:15:03.123 +0100  1234  1250 D Peripheral: Write No Response 0000fff2"));
    assertTrue(NativeLog.isNoise("2026-11-26 10:15:03.123 +0100  1234  1250 D Peripheral: Write 0000fff2"));
    assertTrue(NativeLog.isNoise("2026-11-26 10:15:03.123 +0100  1234  1250 W BLEPlugin: Scan Result"));
    assertTrue(NativeLog.isNoise("2026-11-26 10:15:03.123 +0100  1234  1250 D BLEPlugin: action = writeWithoutResponse"));
    assertFalse(NativeLog.isNoise("2026-11-26 10:15:03.123 +0100  1234  1250 D BLEPlugin: action = connect"));
    assertFalse(NativeLog.isNoise("2026-11-26 10:15:03.123 +0100  1234  1250 D Peripheral: Register Notify 0000fff4"));
    assertFalse(NativeLog.isNoise("2026-11-26 10:15:03.123 +0100  1234  1250 D Peripheral: onConnectionStateChange CONNECTED"));
    assertFalse(NativeLog.isNoise("2026-11-26 10:15:03.123 +0100  1234  1250 D Peripheral: mtu=247, status=0"));
  }

  @Test
  public void exitLevelIsErrorOnlyForAbnormalExits() {
    assertEquals(Log.ERROR, NativeLog.exitLevel(ApplicationExitInfo.REASON_CRASH));
    assertEquals(Log.ERROR, NativeLog.exitLevel(ApplicationExitInfo.REASON_CRASH_NATIVE));
    assertEquals(Log.ERROR, NativeLog.exitLevel(ApplicationExitInfo.REASON_ANR));
    assertEquals(Log.ERROR, NativeLog.exitLevel(ApplicationExitInfo.REASON_LOW_MEMORY));
    assertEquals(Log.INFO, NativeLog.exitLevel(ApplicationExitInfo.REASON_USER_REQUESTED));
    assertEquals(Log.INFO, NativeLog.exitLevel(ApplicationExitInfo.REASON_EXIT_SELF));
  }

  @Test
  public void formatsLogcatStartTimeAsEpochSeconds() {
    assertEquals("1764148503.007", NativeLog.logcatTime(1764148503007L));
    assertEquals("1764148503.123", NativeLog.logcatTime(1764148503123L));
  }

  @Test
  public void parsesLineTimeWithZone() {
    assertEquals(1764148503123L, NativeLog.lineTime("2025-11-26 10:15:03.123 +0100  1234  1250 D Peripheral: x"));
    assertEquals(0, NativeLog.lineTime("logcat: bad argument"));
  }
}
