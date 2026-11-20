package com.beanconqueror;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Resources;
import android.net.Uri;
import android.text.format.DateUtils;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * The home screen widget. It only shows the snapshot the app wrote after its
 * last save and never changes data; a tap opens the app.
 */
public class BrewWidgetProvider extends AppWidgetProvider {
  static final String SNAPSHOT = "snapshot";
  private static final String PREFERENCES = "beanconqueror_widget";
  private static final String TAG = "BrewWidget";

  static SharedPreferences preferences(Context context) {
    return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
  }

  static void updateAll(Context context) {
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    int[] ids = manager.getAppWidgetIds(new ComponentName(context, BrewWidgetProvider.class));
    if (ids.length > 0) {
      manager.updateAppWidget(ids, views(context));
    }
  }

  @Override
  public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
    // Also every 30 minutes, so that "today" and the last brew stay current.
    manager.updateAppWidget(ids, views(context));
  }

  private static RemoteViews views(Context context) {
    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.bq_widget);
    views.setOnClickPendingIntent(R.id.bq_widget_root, openApp(context));
    views.setOnClickPendingIntent(R.id.bq_widget_start_brew, startBrew(context));

    Resources res = context.getResources();
    BrewWidgetCounts counts = readCounts(context);
    if (counts == null) {
      views.setViewVisibility(R.id.bq_widget_counts, View.GONE);
      views.setTextViewText(R.id.bq_widget_last_brew, res.getString(R.string.widget_empty));
      return views;
    }
    views.setViewVisibility(R.id.bq_widget_counts, View.VISIBLE);
    setCount(views, res, R.id.bq_widget_tile_today, R.id.bq_widget_value_today,
      R.plurals.widget_today_description, counts.today());
    setCount(views, res, R.id.bq_widget_tile_week, R.id.bq_widget_value_week,
      R.plurals.widget_week_description, counts.week());
    setCount(views, res, R.id.bq_widget_tile_beans, R.id.bq_widget_value_beans,
      R.plurals.widget_beans_description, counts.beans());

    String lastBrew;
    if (counts.lastBrewAt() == null) {
      lastBrew = res.getString(R.string.widget_no_brew);
    } else {
      CharSequence since = DateUtils.getRelativeTimeSpanString(
        counts.lastBrewAt() * 1000,
        System.currentTimeMillis(),
        DateUtils.MINUTE_IN_MILLIS);
      lastBrew = res.getString(R.string.widget_last_brew, since);
    }
    views.setTextViewText(R.id.bq_widget_last_brew, lastBrew);
    return views;
  }

  private static void setCount(RemoteViews views, Resources res, int tile, int value,
                               int description, int count) {
    views.setTextViewText(value, String.valueOf(count));
    views.setContentDescription(tile, res.getQuantityString(description, count, count));
  }

  private static BrewWidgetCounts readCounts(Context context) {
    String json = preferences(context).getString(SNAPSHOT, null);
    if (json == null) {
      return null;
    }
    try {
      JSONObject snapshot = new JSONObject(json);
      return BrewWidgetCounts.at(
        snapshot.optInt("v"),
        snapshot.optInt("brewsToday"),
        snapshot.optLong("todayEndsAt"),
        snapshot.optInt("brewsThisWeek"),
        snapshot.optLong("weekEndsAt"),
        snapshot.optInt("openBeans"),
        snapshot.isNull("lastBrewAt") ? null : snapshot.optLong("lastBrewAt"),
        System.currentTimeMillis() / 1000);
    } catch (JSONException e) {
      Log.w(TAG, "Snapshot not readable");
      return null;
    }
  }

  private static PendingIntent openApp(Context context) {
    Intent intent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
    return PendingIntent.getActivity(context, 0, intent,
      PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
  }

  private static PendingIntent startBrew(Context context) {
    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("beanconqueror://START_BREW"))
      .setPackage(context.getPackageName());
    return PendingIntent.getActivity(context, 1, intent,
      PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
  }
}
