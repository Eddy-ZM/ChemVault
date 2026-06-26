import Foundation

struct RegionDetector {
    private let cacheRegionKey = "regionDetector.cachedRegion"
    private let cacheDateKey = "regionDetector.cachedDate"
    private let userDefaults: UserDefaults
    private let session: URLSession

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = AppConfig.networkTimeout
        configuration.timeoutIntervalForResource = AppConfig.networkTimeout + 1
        self.session = URLSession(configuration: configuration)
    }

    func detectRegion(forceRefresh: Bool = false) async -> AppRegion {
        if !forceRefresh, let cached = cachedRegionIfFresh() {
            return cached
        }

        let endpoints = [
            URL(string: "https://ipapi.co/json/")!,
            URL(string: "https://ipwho.is/")!,
            URL(string: "https://ipinfo.io/json")!,
            URL(string: "https://www.cloudflare.com/cdn-cgi/trace")!
        ]

        for endpoint in endpoints {
            if let countryCode = await countryCode(from: endpoint) {
                let region: AppRegion = countryCode.uppercased() == "CN" ? .mainlandChina : .international
                cache(region)
                return region
            }
        }

        cache(.international)
        return .international
    }

    private func cachedRegionIfFresh() -> AppRegion? {
        guard let rawValue = userDefaults.string(forKey: cacheRegionKey),
              let cachedRegion = AppRegion(rawValue: rawValue) else {
            return nil
        }

        let cachedDate = userDefaults.object(forKey: cacheDateKey) as? Date ?? .distantPast
        guard Date().timeIntervalSince(cachedDate) < AppConfig.regionCacheTTL else {
            return nil
        }

        return cachedRegion
    }

    private func cache(_ region: AppRegion) {
        userDefaults.set(region.rawValue, forKey: cacheRegionKey)
        userDefaults.set(Date(), forKey: cacheDateKey)
    }

    private func countryCode(from url: URL) async -> String? {
        do {
            let (data, response) = try await session.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200..<300).contains(httpResponse.statusCode) else {
                return nil
            }

            if let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
                let candidates = ["country_code", "country", "countryCode"]
                for key in candidates {
                    if let value = object[key] as? String, !value.isEmpty {
                        return value
                    }
                }
            }

            guard let text = String(data: data, encoding: .utf8) else {
                return nil
            }

            for line in text.split(separator: "\n") {
                let parts = line.split(separator: "=", maxSplits: 1).map(String.init)
                if parts.count == 2, parts[0] == "loc" {
                    return parts[1]
                }
            }

            return nil
        } catch {
            return nil
        }
    }
}
