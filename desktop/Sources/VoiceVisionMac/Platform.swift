import AppKit
import ApplicationServices
import AVFoundation
import Speech
import VoiceVisionCore

@MainActor
final class DisplayOverlays {
    private var windows: [NSWindow] = []
    private var settings = Settings()
    private var enabled = false
    init() {
        NotificationCenter.default.addObserver(self, selector: #selector(screensChanged), name: NSApplication.didChangeScreenParametersNotification, object: nil)
    }
    @objc private func screensChanged() { apply(settings, enabled: enabled) }
    func apply(_ settings: Settings, enabled: Bool) {
        self.settings = settings; self.enabled = enabled
        windows.forEach { $0.close() }; windows.removeAll()
        guard enabled && (settings.dim > 0 || settings.warmth > 0) else { return }
        for screen in NSScreen.screens {
            let window = NSWindow(contentRect: screen.frame, styleMask: .borderless, backing: .buffered, defer: false)
            window.isReleasedWhenClosed = false
            window.isOpaque = false
            window.backgroundColor = .clear
            window.hasShadow = false
            window.ignoresMouseEvents = true
            window.level = .screenSaver
            window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]
            let view = TintView(frame: NSRect(origin: .zero, size: screen.frame.size))
            view.dim = settings.dim; view.warmth = settings.warmth
            window.contentView = view
            window.orderFrontRegardless()
            windows.append(window)
        }
    }
}

@MainActor
private final class TintView: NSView {
    var dim = 0.0
    var warmth = 0.0
    override func draw(_ dirtyRect: NSRect) {
        NSColor.black.withAlphaComponent(dim).setFill(); bounds.fill()
        NSColor(calibratedRed: 1, green: 0.55, blue: 0.1, alpha: warmth).setFill(); bounds.fill()
    }
}

@MainActor
func selectedText() throws -> String {
    guard AXIsProcessTrusted() else { throw TextAccessError.permission }
    let system = AXUIElementCreateSystemWide()
    var focused: CFTypeRef?
    guard AXUIElementCopyAttributeValue(system, kAXFocusedUIElementAttribute as CFString, &focused) == .success,
          let focused, CFGetTypeID(focused) == AXUIElementGetTypeID() else { throw TextAccessError.unavailable }
    let element = unsafeDowncast(focused, to: AXUIElement.self)
    var subrole: CFTypeRef?
    if AXUIElementCopyAttributeValue(element, kAXSubroleAttribute as CFString, &subrole) == .success,
       subrole as? String == kAXSecureTextFieldSubrole as String { throw TextAccessError.unavailable }
    var text: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, kAXSelectedTextAttribute as CFString, &text) == .success,
          let result = text as? String, !result.isEmpty else { throw TextAccessError.unavailable }
    return String(result.prefix(100_000))
}

enum TextAccessError: LocalizedError {
    case permission, unavailable
    var errorDescription: String? {
        switch self {
        case .permission: "Selected text needs Accessibility permission. You can copy text and use Paste instead."
        case .unavailable: "This app did not provide selected text. Copy the passage, then choose Paste from clipboard."
        }
    }
}

@MainActor
final class LocalSpeech: ObservableObject {
    @Published var listening = false
    @Published var requestingPermission = false
    @Published var error = ""
    private let engine = AVAudioEngine()
    private var task: SFSpeechRecognitionTask?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var session = UUID()
    private var tapped = false

    func cancel() {
        session = UUID()
        engine.stop()
        if tapped { engine.inputNode.removeTap(onBus: 0); tapped = false }
        request?.endAudio(); task?.cancel(); request = nil; task = nil; listening = false; requestingPermission = false
    }

    func start(onResult: @escaping @MainActor (String) -> Void) {
        cancel(); error = ""; requestingPermission = true
        let id = session
        SFSpeechRecognizer.requestAuthorization { authorization in
            Task { @MainActor in
                guard self.session == id else { return }
                guard authorization == .authorized else { self.requestingPermission = false; self.error = "Speech permission unavailable. Type a command instead."; return }
                AVCaptureDevice.requestAccess(for: .audio) { allowed in
                    Task { @MainActor in
                        guard self.session == id else { return }
                        guard allowed else { self.requestingPermission = false; self.error = "Microphone permission denied. Typing and buttons still work."; return }
                        self.record(id: id, onResult: onResult)
                    }
                }
            }
        }
    }

    private func record(id: UUID, onResult: @escaping @MainActor (String) -> Void) {
        requestingPermission = false
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")), recognizer.isAvailable, recognizer.supportsOnDeviceRecognition else {
            error = "On-device speech is unavailable. Type a command; no audio will be sent to a cloud service."; return
        }
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.requiresOnDeviceRecognition = true
        request.shouldReportPartialResults = false
        self.request = request
        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0, format.channelCount > 0 else { error = "No usable microphone. Type a command instead."; return }
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in request.append(buffer) }
        tapped = true
        task = recognizer.recognitionTask(with: request) { result, failure in
            let transcript = result?.bestTranscription.formattedString
            let final = result?.isFinal == true
            let failed = failure != nil
            Task { @MainActor in
                guard self.session == id else { return }
                if final, let transcript { self.cancel(); onResult(transcript) }
                else if failed { self.cancel(); self.error = "Speech input stopped. Try again or type a command." }
            }
        }
        do { engine.prepare(); try engine.start(); listening = true }
        catch { cancel(); self.error = "Could not start microphone. Type a command instead." }
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(15))
            guard self.session == id else { return }
            self.cancel(); self.error = "Listening timed out. Try a short command, or type it."
        }
    }
}
