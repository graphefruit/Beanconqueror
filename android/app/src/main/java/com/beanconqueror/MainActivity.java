package com.beanconqueror;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    registerPlugin(BCAndroidNativeCallsPlugin.class);

    super.onCreate(savedInstanceState);
  }
}
