import Foundation

struct RegionDetector {
    private struct CachedRegion: Codable {
        let region: AppRegion
        let detectedAt: Date
    }

    fileprivate struct IPWhoIsResponse: Decodable {
        let success: Bool?
        let countryCode: String?

        enum CodingKeys: String, CodingKey {
            case success
            case countryCode = "country_code"
        }
    }

    fileprivate struct IPInfoResponse: Decodable {
        let country: String?
    }

    private let defaults: UserDefaults
    private let cacheKey = "science.chemvault.app.region-cache.v1"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func detectRegion() async -> AppRegion {
        if let cached = cachedRegion(), Date().timeIntervalSince(cached.detectedAt) < AppConfig.regionCacheTTL {
            return cached.region
        }

        for provider in providers {
            if let countryCode = await provider.countryCode(timeout: AppConfig.regionRequestTimeout) {
                let region: AppRegion = countryCode.uppercased() == "CN" ? .mainlandChina : .international
                cache(region)
                return region
            }
        }

        let fallback: AppRegion = .international
        cache(fallback)
        return fallback
    }

    private var providers: [RegionProvider] {
        [
            CloudflareTraceProvider(),
            IPApiProvider(),
            IPWhoIsProvider(),
            IPInfoProvider()
        ]
    }

    private func cachedRegion() -> CachedRegion? {
        guard let data = defaults.data(forKey: cacheKey) else { return nil }
        return try? JSONDecoder().decode(CachedRegion.self, from: data)
    }

    private func cache(_ region: AppRegion) {
        let cached = CachedRegion(region: region, detectedAt: Date())
        if let data = try? JSONEncoder().encode(cached) {
            defaults.set(data, forKey: cacheKey)
        }
    }
}

private protocol RegionProvider {
    func countryCode(timeout: TimeInterval) async -> String?
}

private extension RegionProvider {
    func fetch(_ url: URL, timeout: TimeInterval) async -> Data? {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = timeout
        configuration.timeoutIntervalForResource = timeout + 1
        let session = URLSession(configuration: configuration)
        do {
            let (data, response) = try await session.data(from: url)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { return nil }
            return data
        } catch {
            return nil
        }
    }
}

private struct CloudflareTraceProvider: RegionProvider {
    func countryCode(timeout: TimeInterval) async -> String? {
        guard let url = URL(string: "https://www.cloudflare.com/cdn-cgi/trace"),
              let data = await fetch(url, timeout: timeout),
              let text = String(data: data, encoding: .utf8) else { return nil }
        return text
            .split(separator: "\n")
            .first { $0.hasPrefix("loc=") }?
            .split(separator: "=", maxSplits: 1)
            .last
            .map(String.init)
    }
}

private struct IPApiProvider: RegionProvider {
    func countryCode(timeout: TimeInterval) async -> String? {
        guard let url = URL(string: "https://ipapi.co/country/"),
              let data = await fetch(url, timeout: timeout),
              let text = String(data: data, encoding: .utf8) else { return nil }
        let code = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return code.count == 2 ? code : nil
    }
}

private struct IPWhoIsProvider: RegionProvider {
    func countryCode(timeout: TimeInterval) async -> String? {
        guard let url = URL(string: "https://ipwho.is/"),
              let data = await fetch(url, timeout: timeout),
              let response = try? JSONDecoder().decode(RegionDetector.IPWhoIsResponse.self, from: data),
              response.success != false else { return nil }
        return response.countryCode
    }
}

private struct IPInfoProvider: RegionProvider {
    func countryCode(timeout: TimeInterval) async -> String? {
        guard let url = URL(string: "https://ipinfo.io/json"),
              let data = await fetch(url, timeout: timeout),
              let response = try? JSONDecoder().decode(RegionDetector.IPInfoResponse.self, from: data) else { return nil }
        return response.country
    }
}
