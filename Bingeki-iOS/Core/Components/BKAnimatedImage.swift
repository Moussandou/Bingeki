import ImageIO
import SwiftUI
import UIKit

/// Remote image that also plays animated GIFs (profile banners and avatars
/// are often GIFs on web, and `AsyncImage` only shows their first frame).
/// Fills its frame like `.aspectRatio(contentMode: .fill)`, with `focusY`
/// choosing which part stays visible vertically (0 = top, 1 = bottom),
/// matching the web's `object-position: center <y>`.
struct BKAnimatedImage<Placeholder: View>: View {
    let url: URL?
    var focusY: CGFloat = 0.5
    @ViewBuilder var placeholder: () -> Placeholder

    @State private var image: UIImage?

    var body: some View {
        ZStack {
            if let image {
                FillImageView(image: image, focusY: focusY)
            } else {
                placeholder()
            }
        }
        .task(id: url) { image = await BKImageLoader.load(url) }
    }
}

/// Downloads and decodes images for `BKAnimatedImage`, with a small in-memory cache.
enum BKImageLoader {
    static func load(_ url: URL?) async -> UIImage? {
        guard let url else { return nil }
        if let cached = cache.object(forKey: url as NSURL) { return cached }
        guard let (data, _) = try? await URLSession.shared.data(from: url) else { return nil }
        let decoded = await Task.detached(priority: .userInitiated) { decode(data) }.value
        if let decoded { cache.setObject(decoded, forKey: url as NSURL) }
        return decoded
    }

    /// Frames are downsampled to `maxPixel` so a long banner GIF stays light in memory.
    nonisolated static func decode(_ data: Data, maxPixel: Int = 900) -> UIImage? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return UIImage(data: data) }
        let count = CGImageSourceGetCount(source)
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixel,
        ]
        guard count > 1 else {
            return CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary).map(UIImage.init(cgImage:)) ?? UIImage(data: data)
        }
        var frames: [UIImage] = []
        var duration: Double = 0
        for index in 0..<min(count, 300) {
            guard let frame = CGImageSourceCreateThumbnailAtIndex(source, index, options as CFDictionary) else { continue }
            frames.append(UIImage(cgImage: frame))
            duration += frameDelay(source, index)
        }
        return UIImage.animatedImage(with: frames, duration: duration > 0 ? duration : Double(frames.count) / 15)
    }

    nonisolated private static func frameDelay(_ source: CGImageSource, _ index: Int) -> Double {
        let props = CGImageSourceCopyPropertiesAtIndex(source, index, nil) as? [CFString: Any]
        let gif = props?[kCGImagePropertyGIFDictionary] as? [CFString: Any]
        let delay = (gif?[kCGImagePropertyGIFUnclampedDelayTime] as? Double) ?? (gif?[kCGImagePropertyGIFDelayTime] as? Double) ?? 0.1
        // Browsers treat near-zero delays as 0.1 s; do the same so GIFs play at web speed.
        return delay < 0.02 ? 0.1 : delay
    }

    nonisolated(unsafe) private static let cache: NSCache<NSURL, UIImage> = {
        let cache = NSCache<NSURL, UIImage>()
        cache.countLimit = 20
        return cache
    }()
}

/// `UIImageView` plays `UIImage.animatedImage` natively; this lays it out as
/// aspect-fill with a vertical focus point.
private struct FillImageView: UIViewRepresentable {
    let image: UIImage
    let focusY: CGFloat

    func makeUIView(context: Context) -> FocusFillView { FocusFillView() }

    func updateUIView(_ view: FocusFillView, context: Context) {
        view.imageView.image = image
        if image.images != nil { view.imageView.startAnimating() }
        view.focusY = focusY
        view.setNeedsLayout()
    }
}

final class FocusFillView: UIView {
    let imageView = UIImageView()
    var focusY: CGFloat = 0.5

    override init(frame: CGRect) {
        super.init(frame: frame)
        clipsToBounds = true
        addSubview(imageView)
        setContentHuggingPriority(.defaultLow, for: .horizontal)
        setContentHuggingPriority(.defaultLow, for: .vertical)
        setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        setContentCompressionResistancePriority(.defaultLow, for: .vertical)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        guard let size = imageView.image?.size, size.width > 0, size.height > 0, bounds.width > 0 else { return }
        let scale = max(bounds.width / size.width, bounds.height / size.height)
        let width = size.width * scale, height = size.height * scale
        imageView.frame = CGRect(x: (bounds.width - width) / 2,
                                 y: (bounds.height - height) * min(max(focusY, 0), 1),
                                 width: width, height: height)
    }
}

enum BKImageFocus {
    /// Web `bannerPosition` ("top", "center", "bottom" or "30%") → 0…1.
    static func y(fromCSS value: String?) -> CGFloat {
        guard let value = value?.trimmingCharacters(in: .whitespaces).lowercased(), !value.isEmpty else { return 0.5 }
        switch value {
        case "top": return 0
        case "bottom": return 1
        case "center": return 0.5
        default:
            if value.hasSuffix("%"), let percent = Double(value.dropLast()) { return CGFloat(percent / 100) }
            return 0.5
        }
    }
}
