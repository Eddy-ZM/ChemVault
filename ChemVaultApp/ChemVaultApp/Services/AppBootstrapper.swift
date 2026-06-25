import Foundation

struct AppBootstrapper {
    private let detector: RegionDetector
    private let resolver: WebResourceResolver

    init(detector: RegionDetector = RegionDetector(), resolver: WebResourceResolver = WebResourceResolver()) {
        self.detector = detector
        self.resolver = resolver
    }

    func loadInitialResource() async throws -> WebResource {
        let region = await detector.detectRegion()
        let variant: WebBundleVariant = region == .mainlandChina ? .chinese : .english
        return try resolver.resource(for: variant)
    }
}
