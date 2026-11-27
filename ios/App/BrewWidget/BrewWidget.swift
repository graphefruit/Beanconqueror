import SwiftUI
import WidgetKit

/// Same app group and key as WidgetPlugin.swift in the app.
private let appGroup = "group.com.beanconqueror.app"
private let snapshotKey = "snapshot"

struct BrewEntry: TimelineEntry {
    let date: Date
    let counts: BrewWidgetCounts?
}

struct BrewTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> BrewEntry {
        BrewEntry(date: Date(), counts: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (BrewEntry) -> Void) {
        completion(entry(at: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BrewEntry>) -> Void) {
        let now = Date()
        let first = entry(at: now)
        var entries = [first]
        // Redrawn when the day and the week end, so that their counts show 0.
        if let counts = first.counts {
            for end in Set([counts.todayEndsAt, counts.weekEndsAt]).sorted() where end > now {
                entries.append(entry(at: end))
            }
        }
        completion(Timeline(entries: entries, policy: .never))
    }

    private func entry(at date: Date) -> BrewEntry {
        let json = UserDefaults(suiteName: appGroup)?.string(forKey: snapshotKey)
        return BrewEntry(date: date, counts: BrewWidgetCounts.at(snapshot: json, now: date))
    }
}

struct BrewWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: BrewEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let counts = entry.counts {
                HStack(alignment: .top) {
                    tile(counts.today, "widget_today", "widget_today_description")
                    if family != .systemSmall {
                        tile(counts.week, "widget_week", "widget_week_description")
                    }
                    tile(counts.beans, "widget_beans", "widget_beans_description")
                }
                lastBrew(counts.lastBrewAt)
            } else {
                Text("widget_empty")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            if family != .systemSmall {
                Spacer(minLength: 0)
                // The small widget can hold no link besides its widgetURL.
                Link(destination: URL(string: "beanconqueror://START_BREW")!) {
                    Text("widget_start_brew")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .frame(minHeight: 44)
                        .background(Capsule().fill(Color.bqAction))
                }
                .accessibilityAddTraits(.isButton)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(Color.bqBackground, for: .widget)
        // A tap outside the button shows the brews.
        .widgetURL(URL(string: "beanconqueror://OPEN_BREWS"))
    }

    private func tile(_ count: Int, _ label: LocalizedStringKey, _ description: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(count, format: .number)
                .font(.title2.bold())
                .minimumScaleFactor(0.6)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(String(format: NSLocalizedString(description, comment: ""), count))
    }

    @ViewBuilder
    private func lastBrew(_ date: Date?) -> some View {
        Group {
            if let date {
                Text("widget_last_brew \(date, style: .relative)")
            } else {
                Text("widget_no_brew")
            }
        }
        .font(.footnote)
        .foregroundStyle(.secondary)
        .lineLimit(2)
    }
}

extension Color {
    /// Same values as the tokens in src/theme/bq-tokens.scss and the Android widget.
    static let bqBackground = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0x21 / 255, green: 0x19 / 255, blue: 0x14 / 255, alpha: 1)
            : UIColor(red: 0xEA / 255, green: 0xD9 / 255, blue: 0xC4 / 255, alpha: 1)
    })
    static let bqAction = Color(red: 0xC7 / 255, green: 0x35 / 255, blue: 0x45 / 255)
}

/// Only for the home screen: whether its counts may show on the lock screen is not decided yet.
@main
struct BrewWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BrewWidget", provider: BrewTimelineProvider()) { entry in
            BrewWidgetView(entry: entry)
        }
        .configurationDisplayName("widget_name")
        .description("widget_description")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
