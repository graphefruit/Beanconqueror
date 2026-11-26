package com.beanconqueror.textrecognition

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "TextRecognition")
class TextRecognitionPlugin : Plugin() {
  @PluginMethod
  fun detectText(call: PluginCall) {
    call.unimplemented("Text recognition is not implemented yet")
  }
}
