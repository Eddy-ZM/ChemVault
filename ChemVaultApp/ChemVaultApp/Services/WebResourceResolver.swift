import Foundation

enum WebResourceError: LocalizedError, Equatable {
    case missingIndex(path: String)
    case missingReadAccess(path: String)

    var errorDescription: String? {
        switch self {
        case .missingIndex(let path):
            return "ChemVault resources are missing. Please rebuild the web bundle. Missing: \(path)"
        case .missingReadAccess(let path):
            return "ChemVault resources are missing. Please rebuild the web bundle. Missing read access directory: \(path)"
        }
    }
}

struct WebResourceResolver {
    func resource(for variant: WebBundleVariant) throws -> WebResource {
        let subdirectory = "Web/\(variant.folderName)"
        guard let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: subdirectory) else {
            let expected = "Bundle.main/\(subdirectory)/index.html"
            print("[ChemVault] Missing web bundle index: \(expected)")
            throw WebResourceError.missingIndex(path: expected)
        }

        guard let readAccessURL = Bundle.main.resourceURL?.appendingPathComponent(subdirectory, isDirectory: true) else {
            let expected = "Bundle.main/\(subdirectory)"
            print("[ChemVault] Missing web bundle directory: \(expected)")
            throw WebResourceError.missingReadAccess(path: expected)
        }

        return WebResource(variant: variant, htmlURL: htmlURL, readAccessURL: readAccessURL)
    }
}
