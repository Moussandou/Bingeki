import FirebaseAuth
import FirebaseCore
import FirebaseFirestore
import Foundation

/// French synopsis shared with the web: the `translations/{type}_{id}_{field}`
/// documents are filled server-side (`onTranslationRequest`) and read by
/// everyone. A signed-in user may request a missing one, like the web does.
enum SynopsisTranslation {
    /// Waits up to `timeout` for the server to fill a freshly requested translation.
    static func french(for text: String, workId: String, timeout: Duration = .seconds(8)) async -> String? {
        guard FirebaseApp.app() != nil, !text.isEmpty else { return nil }
        let ref = Firestore.firestore().collection("translations").document("work_\(sanitize(workId))_synopsis")

        if let snapshot = try? await ref.getDocument(), let data = snapshot.data() {
            if let fr = translated(data, matching: text) { return fr }
            // Exists for an older source text: refresh the request below.
        }
        guard Auth.auth().currentUser != nil else { return nil }
        let now = Int(Date.now.timeIntervalSince1970 * 1000)
        try? await ref.setData([
            "input": text, "sourceId": Int(workId) ?? workId, "sourceType": "work",
            "sourceField": "synopsis", "updatedAt": now, "createdAt": now,
        ], merge: true)

        let deadline = ContinuousClock.now + timeout
        while ContinuousClock.now < deadline {
            try? await Task.sleep(for: .seconds(1))
            if Task.isCancelled { return nil }
            if let data = try? await ref.getDocument().data(), let fr = translated(data, matching: text) { return fr }
        }
        return nil
    }

    private static func translated(_ data: [String: Any], matching text: String) -> String? {
        guard let fr = (data["translated"] as? [String: Any])?["fr"] as? String, !fr.isEmpty else { return nil }
        // A translation made from another source text would be stale.
        if let source = data["translatedInput"] as? String ?? data["input"] as? String, source != text { return nil }
        return fr
    }

    private static func sanitize(_ id: String) -> String {
        String(id.map { $0.isLetter || $0.isNumber || $0 == "_" || $0 == "-" ? $0 : "_" })
    }
}
