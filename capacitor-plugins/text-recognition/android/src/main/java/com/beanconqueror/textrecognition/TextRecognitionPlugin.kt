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

    val bitmap: Bitmap? = try {
      BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    } catch (e: OutOfMemoryError) {
      null
    }
    if (bitmap == null) {
      call.reject("Image cannot be decoded")
      return
    }

    recognizer.process(InputImage.fromBitmap(bitmap, 0))
      .addOnSuccessListener { text -> call.resolve(toJson(text)) }
      .addOnFailureListener { e -> call.reject("Unable to process image", e) }
      .addOnCompleteListener { bitmap.recycle() }
  }

  override fun handleOnDestroy() {
    if (recognizerHolder.isInitialized()) {
      recognizer.close()
    }
  }

  // Same shape as the former ML Kit plugin, so block order and boxes stay as before.
  private fun toJson(text: Text): JSObject {
    val blocks = JSArray()
    text.textBlocks.forEach { block ->
      val lines = JSArray()
      block.lines.forEach { line ->
        val elements = JSArray()
        line.elements.forEach { element ->
          // The former plugin reported the line's language on each element.
          elements.put(textObject(element.text, element.boundingBox, line.recognizedLanguage))
        }
        lines.put(
          textObject(line.text, line.boundingBox, line.recognizedLanguage)
            .put("elements", elements),
        )
      }
      blocks.put(
        textObject(block.text, block.boundingBox, block.recognizedLanguage)
          .put("lines", lines),
      )
    }
    return JSObject().put("text", text.text).put("blocks", blocks)
  }

  private fun textObject(text: String, box: Rect?, language: String): JSObject =
    JSObject()
      .put("text", text)
      .put("boundingBox", box?.let {
        JSObject()
          .put("left", it.left)
          .put("top", it.top)
          .put("right", it.right)
          .put("bottom", it.bottom)
      })
      .put("recognizedLanguage", language)
}
