import Network
import Observation
import Foundation

/// Connectivity for the offline banner (États #6).
@MainActor
@Observable
final class NetworkMonitor {
    private(set) var isOnline = true
    private let monitor = NWPathMonitor()

    init() {
        #if DEBUG
        // `-bk.forceOffline YES` to preview the banner on the simulator.
        if UserDefaults.standard.bool(forKey: "bk.forceOffline") {
            isOnline = false
            return
        }
        #endif
        monitor.pathUpdateHandler = { [weak self] path in
            let online = path.status == .satisfied
            Task { @MainActor in self?.isOnline = online }
        }
        monitor.start(queue: DispatchQueue(label: "bk.network-monitor"))
    }
}
