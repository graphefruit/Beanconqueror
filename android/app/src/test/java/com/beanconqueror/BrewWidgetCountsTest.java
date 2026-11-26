package com.beanconqueror;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class BrewWidgetCountsTest {
  private static final long TODAY_ENDS = 1_000_000L;
  private static final long WEEK_ENDS = 1_300_000L;

  private static BrewWidgetCounts at(int version, long now) {
    return BrewWidgetCounts.at(version, 2, TODAY_ENDS, 9, WEEK_ENDS, 4, 900_000L, now);
  }

  @Test
  public void showsTheCountsOfTheCurrentDayAndWeek() {
    BrewWidgetCounts counts = at(1, TODAY_ENDS - 1);

    assertEquals(new BrewWidgetCounts(2, 9, 4, 900_000L, TODAY_ENDS), counts);
  }

  @Test
  public void refreshesAtTheEndOfTheDayFirst() {
    assertEquals(Long.valueOf(TODAY_ENDS), at(1, TODAY_ENDS - 1).refreshAt());
  }

  @Test
  public void refreshesAtTheEndOfTheWeekOnceTheDayIsOver() {
    assertEquals(Long.valueOf(WEEK_ENDS), at(1, TODAY_ENDS).refreshAt());
  }

  @Test
  public void needsNoRefreshOnceTheWeekIsOver() {
    assertNull(at(1, WEEK_ENDS).refreshAt());
  }

  @Test
  public void showsNoBrewsTodayOnceTheDayIsOver() {
    BrewWidgetCounts counts = at(1, TODAY_ENDS);

    assertEquals(new BrewWidgetCounts(0, 9, 4, 900_000L, WEEK_ENDS), counts);
  }

  @Test
  public void showsNoBrewsThisWeekOnceTheWeekIsOver() {
    BrewWidgetCounts counts = at(1, WEEK_ENDS);

    assertEquals(new BrewWidgetCounts(0, 0, 4, 900_000L, null), counts);
  }

  @Test
  public void keepsAMissingLastBrew() {
    BrewWidgetCounts counts =
      BrewWidgetCounts.at(1, 0, TODAY_ENDS, 0, WEEK_ENDS, 0, null, TODAY_ENDS - 1);

    assertEquals(new BrewWidgetCounts(0, 0, 0, null, TODAY_ENDS), counts);
  }

  @Test
  public void isEmptyForASnapshotOfAnotherForm() {
    assertNull(at(2, TODAY_ENDS - 1));
  }

  @Test
  public void isEmptyWithoutAVersion() {
    assertNull(at(0, TODAY_ENDS - 1));
  }
}
