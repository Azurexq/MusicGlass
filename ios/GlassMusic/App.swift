import AVFoundation
import UIKit
import WebKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        try? AVAudioSession.sharedInstance().setCategory(.playback) // keeps playing with the silent switch on or the screen locked
        window = UIWindow(frame: UIScreen.main.bounds)
        window!.rootViewController = WebController()
        window!.makeKeyAndVisible()
        return true
    }
}

/// Serves index.html from the app bundle at glassmusic://app/, so the app opens offline and keeps a stable origin for its storage.
final class BundleScheme: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url,
              let file = Bundle.main.url(forResource: url.lastPathComponent, withExtension: nil),
              let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let type = url.pathExtension == "html" ? "text/html; charset=utf-8" : "application/octet-stream"
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: nil, headerFields: ["Content-Type": type])!)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

final class WebController: UIViewController, WKUIDelegate, WKNavigationDelegate {
    private let web: WKWebView = {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleScheme(), forURLScheme: "glassmusic")
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        return WKWebView(frame: .zero, configuration: config)
    }()

    override func loadView() { view = web }

    override func viewDidLoad() {
        super.viewDidLoad()
        web.uiDelegate = self
        web.navigationDelegate = self
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.backgroundColor = .black
        web.scrollView.contentInsetAdjustmentBehavior = .never // the page pads itself with env(safe-area-inset-*)
        web.load(URLRequest(url: URL(string: "glassmusic://app/index.html")!))
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    // window.open / target=_blank (SoundCloud search, "open in Deezer") goes to Safari
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url { UIApplication.shared.open(url) }
        return nil
    }

    // the app page itself never leaves the bundle; embeds in iframes load normally
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if action.targetFrame?.isMainFrame == true, let url = action.request.url, url.scheme != "glassmusic" {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        } else {
            decisionHandler(.allow)
        }
    }

    // WKWebView shows nothing for alert/confirm/prompt unless the app draws them
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .destructive) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(alert.textFields?.first?.text) })
        present(alert, animated: true)
    }
}
