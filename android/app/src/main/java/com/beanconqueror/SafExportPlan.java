package com.beanconqueror;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

/**
 * Decides how an export is written into a folder the user picked.
 *
 * A storage provider does not replace a file it is asked to create under a
 * name that is taken, it adds " (1)". So a file of the folder that has the
 * name of one of the export is written over, and that only when an export
 * of this app that did not finish wrote it: the marker file lists every file
 * such an export was going to write, and it is written before the first one.
 * Any other file of that name is the user's and stops the export before
 * anything is written. The zip comes last, so the folder holds one only when
 * all of its files are there; the marker is removed after it.
 */
final class SafExportPlan {
  static final String MARKER_NAME = "Beanconqueror_unfinished_export.txt";

  /** A file of the folder the export would write over, or null. */
  final String conflict;
  /** The files to write, in this order. */
  final List<String> order;
  /** What the marker lists while they are written. */
  final Set<String> marked;
  /**
   * Whether the marker has to be written. One that lists all already is left
   * as it is, so a restart that is cut off while writing it cannot shorten it.
   */
  final boolean writeMarker;

  private SafExportPlan(
    String conflict, List<String> order, Set<String> marked, boolean writeMarker) {
    this.conflict = conflict;
    this.order = order;
    this.marked = marked;
    this.writeMarker = writeMarker;
  }

  /**
   * @param files    the paths of the export, relative to the folder
   * @param taken    those of them, or of their folders, the folder has already
   * @param marked   what the marker of an unfinished export lists; empty without one
   * @param lastFile the file that tells the export is complete
   */
  static SafExportPlan of(
    List<String> files,
    Collection<String> taken,
    Set<String> marked,
    String lastFile
  ) {
    for (String path : new TreeSet<>(taken)) {
      if (!marked.contains(path)) {
        return new SafExportPlan(path, Collections.emptyList(), Collections.emptySet(), false);
      }
    }
    List<String> order = new ArrayList<>(files);
    if (order.remove(lastFile)) {
      order.add(lastFile);
    }
    Set<String> nowMarked = new TreeSet<>(marked);
    nowMarked.addAll(files);
    return new SafExportPlan(null, order, nowMarked, !nowMarked.equals(marked));
  }
}
