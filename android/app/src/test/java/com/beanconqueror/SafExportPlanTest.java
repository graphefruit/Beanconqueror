package com.beanconqueror;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import org.junit.Test;

public class SafExportPlanTest {
  private static final String ZIP = "Beanconqueror.zip";
  private static final List<String> FILES =
    Arrays.asList("b/photo1.jpg", ZIP, "b/photo2.jpg");

  private static Set<String> set(String... paths) {
    return new TreeSet<>(Arrays.asList(paths));
  }

  @Test
  public void writesAnEmptyFolderWithTheZipLast() {
    SafExportPlan plan = SafExportPlan.of(FILES, set(), set(), ZIP);

    assertNull(plan.conflict);
    assertEquals(Arrays.asList("b/photo1.jpg", "b/photo2.jpg", ZIP), plan.order);
    assertEquals(set("b/photo1.jpg", "b/photo2.jpg", ZIP), plan.marked);
  }

  @Test
  public void writesOverTheFilesOfAnExportThatDidNotFinish() {
    SafExportPlan plan = SafExportPlan.of(
      FILES, set("b/photo1.jpg"), set("b/photo1.jpg", ZIP, "b/photo2.jpg"), ZIP);

    assertNull(plan.conflict);
    assertEquals(Arrays.asList("b/photo1.jpg", "b/photo2.jpg", ZIP), plan.order);
  }

  @Test
  public void writesOverAZipThatWasWrittenButNotMarkedAsFinished() {
    SafExportPlan plan = SafExportPlan.of(FILES, set(ZIP), set(ZIP), ZIP);

    assertNull(plan.conflict);
  }

  @Test
  public void keepsMarkingTheFilesOfEveryUnfinishedExport() {
    SafExportPlan plan = SafExportPlan.of(
      Collections.singletonList(ZIP), set("b/old.jpg"), set("b/old.jpg"), ZIP);

    assertNull(plan.conflict);
    assertEquals(set("b/old.jpg", ZIP), plan.marked);
  }

  @Test
  public void touchesNoFileItDidNotWrite() {
    SafExportPlan plan = SafExportPlan.of(
      FILES, set("b/photo2.jpg", "b/photo1.jpg"), set("b/photo1.jpg"), ZIP);

    assertEquals("b/photo2.jpg", plan.conflict);
    assertEquals(Collections.emptyList(), plan.order);
  }

  @Test
  public void touchesNoCompleteExport() {
    assertEquals(ZIP, SafExportPlan.of(FILES, set(ZIP), set(), ZIP).conflict);
  }
}
