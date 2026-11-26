package com.beanconqueror;

import android.app.AlarmManager;
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
 * last save and never changes data; a tap shows the brews, the button opens a new brew.
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
      update(context, manager, ids);
    }
  }

  @Override
  public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
    // Also every 30 minutes, so that the last brew stays current.
    update(context, manager, ids);
  }

  @Override
  public void onDisabled(Context context) {
    alarms(context).cancel(refresh(context));
  }

  private static void update(Context context, AppWidgetManager manager, int[] ids) {
    BrewWidgetCounts counts = readCounts(context);
    manager.updateAppWidget(ids, views(context, counts));
    // Inexact, as exact alarms need a permission; it fires a few minutes late at most while
    // the screen is on.
    AlarmManager alarms = alarms(context);
    if (counts == null || counts.refreshAt() == null) {
      alarms.cancel(refresh(context));
    } else {
      alarms.set(AlarmManager.RTC, counts.refreshAt() * 1000, refresh(context));
    }
  }

  private static AlarmManager alarms(Context context) {
    return (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
  }

  /** Redraws the widget when the day or the week ends, so that their counts show 0. */
  private static PendingIntent refresh(Context context) {
    Intent intent = new Intent(context, BrewWidgetProvider.class)
      .setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
      .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, AppWidgetManager.getInstance(context)
        .getAppWidgetIds(new ComponentName(context, BrewWidgetProvider.class)));
    return PendingIntent.getBroadcast(context, 0, intent,
      PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
  }

  private static RemoteViews views(Context context, BrewWidgetCounts counts) {
    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.bq_widget);
    views.setOnClickPendingIntent(R.id.bq_widget_root, link(context, 0, "beanconqueror://OPEN_BREWS"));
    views.setOnClickPendingIntent(R.id.bq_widget_start_brew,
      link(context, 1, "beanconqueror://START_BREW"));

    Resources res = context.getResources();
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

  private static PendingIntent link(Context context, int requestCode, String url) {
    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url))
      .setPackage(context.getPackageName());
    return PendingIntent.getActivity(context, requestCode, intent,
      PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
  }
}
