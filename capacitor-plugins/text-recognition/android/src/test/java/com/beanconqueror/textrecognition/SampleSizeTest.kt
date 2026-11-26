package com.beanconqueror.textrecognition

import org.junit.Assert.assertEquals
import org.junit.Test

class SampleSizeTest {
  @Test
  fun keepsImagesWithinTheLimit() {
    assertEquals(1, sampleSizeFor(2560, 1920, MAX_IMAGE_EDGE))
    assertEquals(1, sampleSizeFor(4096, 4096, MAX_IMAGE_EDGE))
  }

  @Test
  fun halvesUntilTheLongerEdgeFits() {
    assertEquals(2, sampleSizeFor(8160, 6120, MAX_IMAGE_EDGE))
    assertEquals(2, sampleSizeFor(3000, 4097, MAX_IMAGE_EDGE))
    assertEquals(4, sampleSizeFor(16384, 100, MAX_IMAGE_EDGE))
  }

  @Test
  fun treatsUnknownBoundsAsSmall() {
    assertEquals(1, sampleSizeFor(-1, -1, MAX_IMAGE_EDGE))
  }
}
