import SwiftUI
import WebKit

#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

#if os(iOS)
struct WebView: UIViewRepresentable {
    let resource: WebResource

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let webView = makeConfiguredWebView(context: context)
        webView.allowsBackForwardNavigationGestures = true
        load(resource, in: webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard webView.url != resource.htmlURL else { return }
        load(resource, in: webView)
    }
}
#elseif os(macOS)
struct WebView: NSViewRepresentable {
    let resource: WebResource

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeNSView(context: Context) -> WKWebView {
        let webView = makeConfiguredWebView(context: context)
        load(resource, in: webView)
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        guard webView.url != resource.htmlURL else { return }
        load(resource, in: webView)
    }
}
#endif

private extension WebView {
    func makeConfiguredWebView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        #if os(macOS)
        webView.allowsMagnification = true
        #endif
        #if os(macOS)
        webView.setValue(false, forKey: "drawsBackground")
        #endif
        return webView
    }

    func load(_ resource: WebResource, in webView: WKWebView) {
        webView.loadFileURL(resource.htmlURL, allowingReadAccessTo: resource.readAccessURL)
    }
}

final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        if shouldOpenExternally(url: url, navigationAction: navigationAction) {
            openExternally(url)
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard let url = navigationAction.request.url else { return nil }
        if shouldOpenExternally(url: url, navigationAction: navigationAction) {
            openExternally(url)
        } else {
            webView.load(URLRequest(url: url))
        }
        return nil
    }

    private func shouldOpenExternally(url: URL, navigationAction: WKNavigationAction) -> Bool {
        if url.isFileURL { return false }

        guard let scheme = url.scheme?.lowercased() else { return true }
        if ["mailto", "tel", "sms", "facetime"].contains(scheme) { return true }
        guard ["http", "https"].contains(scheme) else { return true }

        let host = url.host?.lowercased() ?? ""
        if AppConfig.internalHosts.contains(host) { return false }
        if navigationAction.targetFrame == nil { return true }
        return true
    }

    private func openExternally(_ url: URL) {
        #if os(iOS)
        UIApplication.shared.open(url)
        #elseif os(macOS)
        NSWorkspace.shared.open(url)
        #endif
    }
}
