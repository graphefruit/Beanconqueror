package com.beanconqueror;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private static Window window;
  private static View webView;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    registerPlugin(BCAndroidNativeCallsPlugin.class);

    super.onCreate(savedInstanceState);
    window = getWindow();
    webView = getBridge().getWebView();
  }

  public static void makeTransparent() {
    if (window != null && webView != null) {
      window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
      webView.setBackgroundColor(Color.TRANSPARENT);
    }
  }

  public static void makeOpaque() {
    if (window != null && webView != null) {
      // In styles.xml the background is @null, so we can probably just set it to white
      window.setBackgroundDrawable(new ColorDrawable(Color.WHITE));
      webView.setBackgroundColor(Color.WHITE);
    }
  }
}
