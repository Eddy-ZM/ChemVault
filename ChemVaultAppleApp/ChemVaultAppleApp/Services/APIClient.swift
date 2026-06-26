import Foundation

enum APIError: LocalizedError {
    case invalidResponse
    case serverStatus(Int)
    case encodingFailed

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "The server returned an invalid response."
        case .serverStatus(let status):
            return "The server returned status code \(status)."
        case .encodingFailed:
            return "The request body could not be encoded."
        }
    }
}

final class APIClient {
    var baseURL: URL
    var authToken: String?

    init(baseURL: URL = AppConfig.defaultAPIBaseURL, authToken: String? = nil) {
        self.baseURL = baseURL
        self.authToken = authToken
    }

    func get<Response: Decodable>(_ path: String, as type: Response.Type) async throws -> Response {
        var request = URLRequest(url: endpoint(path))
        request.httpMethod = "GET"
        applyHeaders(to: &request)
        return try await perform(request, as: type)
    }

    func post<Body: Encodable, Response: Decodable>(_ path: String, body: Body, as type: Response.Type) async throws -> Response {
        var request = URLRequest(url: endpoint(path))
        request.httpMethod = "POST"
        request.httpBody = try JSONEncoder().encode(body)
        applyHeaders(to: &request)
        return try await perform(request, as: type)
    }

    private func endpoint(_ path: String) -> URL {
        baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
    }

    private func applyHeaders(to request: inout URLRequest) {
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let authToken, !authToken.isEmpty {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }
    }

    private func perform<Response: Decodable>(_ request: URLRequest, as type: Response.Type) async throws -> Response {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw APIError.serverStatus(httpResponse.statusCode)
        }
        return try JSONDecoder().decode(Response.self, from: data)
    }
}

enum APIEndpoint {
    static let userMe = "/api/user/me"
    static let files = "/api/files"
    static let docs = "/api/docs"
    static let model = "/api/model"
    static let extractJobs = "/api/extract/jobs"
    static let notifications = "/api/notifications"
    static let permissions = "/api/permissions"
}
