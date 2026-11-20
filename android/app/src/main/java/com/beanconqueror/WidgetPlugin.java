package com.beanconqueror;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Hands the home screen widget the snapshot the web app computed. */
@CapacitorPlugin(name = "Widget")
public class WidgetPlugin extends Plugin {

  @PluginMethod
  public void setSnapshot(PluginCall call) {
    String snapshot = call.getString("snapshot");
    if (snapshot == null) {
      call.reject("No snapshot");
      return;
    }
    // commit, not apply: the widget reads it right after this call.
    boolean written = BrewWidgetProvider.preferences(getContext())
      .edit()
      .putString(BrewWidgetProvider.SNAPSHOT, snapshot)
      .commit();
    if (written) {
      call.resolve();
    } else {
      call.reject("Snapshot not written");
    }
  }

  @PluginMethod
  public void reload(PluginCall call) {
    BrewWidgetProvider.updateAll(getContext());
    call.resolve();
  }
}
