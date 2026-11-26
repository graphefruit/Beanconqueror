package com.beanconqueror.textrecognition

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.util.Base64
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

// The app already shrinks photos to 2560 px; this only bounds decode memory for other input.
internal const val MAX_IMAGE_EDGE = 4096

/** Smallest power-of-two sample size that brings the longer edge to at most maxEdge. */
internal fun sampleSizeFor(width: Int, height: Int, maxEdge: Int): Int {
  var sampleSize = 1
  while (maxOf(width, height) / sampleSize > maxEdge) {
    sampleSize *= 2
  }
  return sampleSize
}

@CapacitorPlugin(name = "TextRecognition")
class TextRecognitionPlugin : Plugin() {
  private val recognizerHolder = lazy {
    TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
  }
  private val recognizer: TextRecognizer by recognizerHolder

  @PluginMethod
  fun detectText(call: PluginCall) {
    val encodedImage = call.getString("base64Image")
    if (encodedImage.isNullOrEmpty()) {
      call.reject("No image is given")
      return
    }
    val bytes = try {
      Base64.decode(encodedImage, Base64.DEFAULT)
    } catch (e: IllegalArgumentException) {
      call.reject("Image is not valid base64")
      return
    }

    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    val sampleSize = sampleSizeFor(bounds.outWidth, bounds.outHeight, MAX_IMAGE_EDGE)
    val bitmap: Bitmap? = try {
      val options = BitmapFactory.Options().apply { inSampleSize = sampleSize }
      BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
    } catch (e: OutOfMemoryError) {
      null
    }
    if (bitmap == null) {
      call.reject("Image cannot be decoded")
      return
    }

    recognizer.process(InputImage.fromBitmap(bitmap, 0))
      .addOnSuccessListener { text -> call.resolve(toJson(text, sampleSize)) }
      .addOnFailureListener { e -> call.reject("Unable to process image", e) }
      .addOnCompleteListener { bitmap.recycle() }
  }

  override fun handleOnDestroy() {
    if (recognizerHolder.isInitialized()) {
      recognizer.close()
    }
  }

  // Same shape as the former ML Kit plugin, so block order and boxes stay as before.
  // Boxes are scaled back by the sample size, so they are in pixels of the given image.
  private fun toJson(text: Text, scale: Int): JSObject {
    val blocks = JSArray()
    text.textBlocks.forEach { block ->
      val lines = JSArray()
      block.lines.forEach { line ->
        val elements = JSArray()
        line.elements.forEach { element ->
          // The former plugin reported the line's language on each element.
          elements.put(textObject(element.text, element.boundingBox, line.recognizedLanguage, scale))
        }
        lines.put(
          textObject(line.text, line.boundingBox, line.recognizedLanguage, scale)
            .put("elements", elements),
        )
      }
      blocks.put(
        textObject(block.text, block.boundingBox, block.recognizedLanguage, scale)
          .put("lines", lines),
      )
    }
    return JSObject().put("text", text.text).put("blocks", blocks)
  }

  private fun textObject(text: String, box: Rect?, language: String, scale: Int): JSObject =
    JSObject()
      .put("text", text)
      .put("boundingBox", box?.let {
        JSObject()
          .put("left", it.left * scale)
          .put("top", it.top * scale)
          .put("right", it.right * scale)
          .put("bottom", it.bottom * scale)
      })
      .put("recognizedLanguage", language)
}
