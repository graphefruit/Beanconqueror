package com.beanconqueror;

import android.os.Bundle;
import android.view.View;

import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    registerPlugin(BCAndroidNativeCallsPlugin.class);

    super.onCreate(savedInstanceState);

    resizeWebViewForKeyboard();
  }

  /**
   * With edge-to-edge the window no longer shrinks for the keyboard, so inputs end up hidden
   * behind it. Capacitor < 8.4 padded the WebView parent by the IME height even with
   * SystemBars insetsHandling "disable"; newer versions skip that, and capawesome edge-to-edge
   * only handles system bars. Restore the IME padding here. Insets are passed through so the
   * edge-to-edge listener on the WebView keeps working.
   */
  private void resizeWebViewForKeyboard() {
    View webViewParent = (View) getBridge().getWebView().getParent();
    ViewCompat.setOnApplyWindowInsetsListener(webViewParent, (view, insets) -> {
      boolean keyboardVisible = insets.isVisible(WindowInsetsCompat.Type.ime());
      int keyboardHeight = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom;
      view.setPadding(0, 0, 0, keyboardVisible ? keyboardHeight : 0);
      return insets;
    });
  }
}
