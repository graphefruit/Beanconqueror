package com.beanconqueror;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;

import java.util.Objects;

/**
 * Hacky handling of status bar color management.
 * <p>
 * <b>TODO: Remove this hack for android during Capacitor 8 migration, see issue #1003 and #1006</b>
 */
public class CustomInsets {

  public static final String OVERLAY_VIEW_TAG = "customStatusBarOverlay";

  private CustomInsets() {
  }

  /**
   * Initialize the custom insets. Must be called on the UI thread!
   *
   * @param activity The main activity of the app.
   */
  public static void initialize(Activity activity) {
    if (Build.VERSION.SDK_INT < 35) {
      return;
    }

    // SDK >= 35

    // 1. Create the overlay view
    ViewGroup contentView = getContentView(activity);
    View newOverlayView = contentView.findViewWithTag(OVERLAY_VIEW_TAG);
    if (newOverlayView != null) {
      throw new IllegalStateException("Overlay view already exists. Did you call initialize() twice?");
    }
    newOverlayView = new View(activity);
    newOverlayView.setTag(OVERLAY_VIEW_TAG);
    contentView.addView(newOverlayView);


    // Final variable for lambda capture below
    final View overlayView = newOverlayView;
    contentView.setOnApplyWindowInsetsListener((view, insets) -> {
      android.graphics.Insets statusBarInsets = insets.getInsets(WindowInsets.Type.statusBars());
      int statusBarHeight = statusBarInsets.top;

      // 2. Position it at the top with correct height
      // Note: If contentView is FrameLayout, we use FrameLayout.LayoutParams
      if (overlayView.getLayoutParams() instanceof FrameLayout.LayoutParams params) {
        params.width = FrameLayout.LayoutParams.MATCH_PARENT;
        params.height = statusBarHeight;
        params.gravity = Gravity.TOP;
        overlayView.setLayoutParams(params);
      } else {
        // Fallback if not set yet or different param type
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
          FrameLayout.LayoutParams.MATCH_PARENT,
          statusBarHeight
        );
        params.gravity = Gravity.TOP;
        overlayView.setLayoutParams(params);
      }

      overlayView.bringToFront();

      // 3. Return INSETS UNMODIFIED
      // This ensures Ionic/WebView receives the insets and applies the Safe Area padding internally.
      // Since our overlay sits in that "Safe Area" (0..50px), it acts as the background.
      return insets;
    });
  }

  /**
   * Initialize the custom insets. Must be called on the UI thread!
   *
   * @param activity The main activity of the app.
   * @param color    The new background color of the insets.
   */
  public static void updateBackgroundColor(Activity activity, int color) {
    if (Build.VERSION.SDK_INT < 35) {
      Window window = activity.getWindow();
      window.setStatusBarColor(color);
      return;
    }

    // SDK >= 35
    View overlay = getContentView(activity).findViewWithTag("customStatusBarOverlay");
    if (overlay == null) {
      throw new IllegalStateException("Overlay does not exist. Did you forget to call initialize()?");
    }

    overlay.setBackgroundColor(color);
  }

  @NonNull
  private static ViewGroup getContentView(Activity activity) {
    Window window = activity.getWindow();
    ViewGroup contentView = window.findViewById(android.R.id.content);
    return Objects.requireNonNull(contentView, "ContentView must exist");
  }
}
