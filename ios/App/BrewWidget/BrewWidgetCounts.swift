import Foundation

/// What the widget shows of the snapshot the app wrote; free of WidgetKit, as on Android.
struct BrewWidgetCounts: Equatable {
    let today: Int
    let week: Int
    let beans: Int
    let lastBrewAt: Date?
    let todayEndsAt: Date
    let weekEndsAt: Date

    /// The counts at `now`, or nil for a missing snapshot or one of another form, which the
    /// widget shows as empty.
    static func at(snapshot json: String?, now: Date) -> BrewWidgetCounts? {
        guard let data = json?.data(using: .utf8),
              let snapshot = try? JSONDecoder().decode(Snapshot.self, from: data),
              snapshot.v == 1 else {
            return nil
        }
        let nowSeconds = now.timeIntervalSince1970
        // A day or week that is over has no brews yet: every brew is saved in the app, which
        // then writes a new snapshot.
        return BrewWidgetCounts(
            today: nowSeconds < snapshot.todayEndsAt ? snapshot.brewsToday : 0,
            week: nowSeconds < snapshot.weekEndsAt ? snapshot.brewsThisWeek : 0,
            beans: snapshot.openBeans,
            lastBrewAt: snapshot.lastBrewAt.map { Date(timeIntervalSince1970: $0) },
            todayEndsAt: Date(timeIntervalSince1970: snapshot.todayEndsAt),
            weekEndsAt: Date(timeIntervalSince1970: snapshot.weekEndsAt))
    }

    /// The form of src/stores/brews/widget-snapshot.ts; times are unix seconds.
    private struct Snapshot: Decodable {
        let v: Int
        let brewsToday: Int
        let todayEndsAt: Double
        let brewsThisWeek: Int
        let weekEndsAt: Double
        let openBeans: Int
        let lastBrewAt: Double?
    }
}
