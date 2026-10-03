import SwiftUI
import AppKit
import AVFoundation
import VoiceVisionCore

@MainActor
final class AppModel: ObservableObject {
    @Published var history: SettingsHistory
    var enabled: Bool { history.current.screenEnabled }
    @Published var text = "Paste a passage or bring selected text here. Adjust its size and spacing, or listen to it."
    @Published var status = "Ready. Screen adjustments start off."
    let speech = LocalSpeech()
    private let overlays = DisplayOverlays()
    private let speaker = AVSpeechSynthesizer()
    init() {
        var settings = VoiceVisionCore.Settings()
        if let data = UserDefaults.standard.data(forKey: "readingPreferences"), let stored = try? JSONDecoder().decode(VoiceVisionCore.Settings.self, from: data) { settings = stored; settings.normalize(); settings.screenEnabled = false }
        history = SettingsHistory(settings: settings)
    }
    func change(_ action: (inout VoiceVisionCore.Settings) -> Void) {
        speech.cancel(); history.change(action); update(); status = "Preferences updated. Undo is available."
    }
    func update() {
        overlays.apply(history.current, enabled: enabled)
        var saved = history.current; saved.screenEnabled = false
        if let data = try? JSONEncoder().encode(saved) { UserDefaults.standard.set(data, forKey: "readingPreferences") }
    }
    func toggleScreen(_ value: Bool) { speech.cancel(); history.change { $0.screenEnabled = value }; update(); status = value ? "Screen adjustments on." : "Screen adjustments off." }
    func reset() { speech.cancel(); speaker.stopSpeaking(at: .immediate); history.reset(); update(); status = "Reset. All VoiceVision screen adjustments removed." }
    func undo() { speech.cancel(); history.undo(); update(); status = "Previous preferences restored." }
    func command(_ raw: String) {
        speech.cancel()
        let text = raw.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        if text == "undo" { undo(); return }
        if ["reset", "reset all", "back to normal"].contains(text) { reset(); return }
        var next = history.current
        switch next.apply(String(text.prefix(300))) {
        case .changed: if next.dim != history.current.dim || next.warmth != history.current.warmth { next.screenEnabled = true }; history.change { $0 = next }; update(); status = "Requested preferences applied. Reader text size applies inside VoiceVision."
        case .unchanged: status = "Settings unchanged. Choose adjustments by need; a condition does not choose settings."
        case .unknown: status = "Try larger text, more spacing, less glare, warm tint, undo or reset."
        }
    }
    func paste() {
        guard let value = NSPasteboard.general.string(forType: .string), !value.isEmpty else { status = "No text on the clipboard. Copy a passage first."; return }
        text = String(value.prefix(100_000)); status = "Text pasted locally. Nothing uploaded."
    }
    func selection() {
        do { text = try selectedText(); status = "Selected text loaded locally." }
        catch { status = error.localizedDescription }
    }
    func readAloud() {
        speaker.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: String(text.prefix(100_000)))
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        speaker.speak(utterance); status = "Reading aloud using macOS speech. Stop is available."
    }
    func stopReading() { speaker.stopSpeaking(at: .immediate); status = "Read-aloud stopped." }
    func settings(_ anchor: String) {
        guard let url = URL(string: "x-apple.systempreferences:com.apple.preference.universalaccess?\(anchor)") else { return }
        if !NSWorkspace.shared.open(url) { status = "Open System Settings → Accessibility, then choose \(anchor)." }
    }
}

@main
struct VoiceVisionApp: App {
    @StateObject private var model = AppModel()
    var body: some Scene {
        WindowGroup("VoiceVision", id: "controls") {
            Controls(model: model).frame(minWidth: 460, minHeight: 640)
        }.defaultSize(width: 520, height: 760)
        WindowGroup("VoiceVision Reader", id: "reader") {
            Reader(model: model).frame(minWidth: 400, minHeight: 360)
        }.defaultSize(width: 740, height: 700)
        MenuBarExtra("VoiceVision", systemImage: "eye") { MenuControls(model: model) }
    }
}

struct MenuControls: View {
    @ObservedObject var model: AppModel
    @Environment(\.openWindow) private var openWindow
    var body: some View {
        Button("Open VoiceVision") { openWindow(id: "controls"); NSApp.activate(ignoringOtherApps: true) }
        Toggle("Screen adjustments", isOn: Binding(get: { model.enabled }, set: model.toggleScreen))
        Button("Read selected text") { model.selection(); openWindow(id: "reader"); NSApp.activate(ignoringOtherApps: true) }
        Button("Paste into reader") { model.paste(); openWindow(id: "reader") }
        Divider()
        Button("Undo") { model.undo() }.disabled(model.history.previous == nil)
        Button("Reset all") { model.reset() }
        Divider()
        Button("Quit VoiceVision") { model.reset(); NSApp.terminate(nil) }
    }
}

struct Controls: View {
    @ObservedObject var model: AppModel
    @State private var command = ""
    @Environment(\.openWindow) private var openWindow
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Make your Mac easier to use.").font(.largeTitle.bold())
                Text("Screen comfort across your apps. A clearer place for reading.").foregroundStyle(.secondary)
                HStack {
                    Button("Undo") { model.undo() }.disabled(model.history.previous == nil)
                    Button("Reset all") { model.reset() }
                }
                GroupBox("Across your displays") {
                    VStack(alignment: .leading, spacing: 14) {
                        Toggle("Enable screen adjustments", isOn: Binding(get: { model.enabled }, set: model.toggleScreen))
                        adjustment("Dim screen", key: \.dim, range: 0...0.45, step: 0.05)
                        adjustment("Warm tint", key: \.warmth, range: 0...0.25, step: 0.025)
                        Text("Colour and dimming are optional preferences, not eye protection. Your mouse still reaches apps underneath.").font(.callout).foregroundStyle(.secondary)
                    }.padding(8)
                }
                GroupBox("Reader") {
                    VStack(alignment: .leading, spacing: 14) {
                        adjustment("Reader text size", key: \.textSize, range: 16...48, step: 2)
                        adjustment("Reader line spacing", key: \.spacing, range: 0...24, step: 2)
                        Button("Open reader") { openWindow(id: "reader") }
                        Button("Paste from clipboard and open reader") { model.paste(); openWindow(id: "reader") }
                        Text("To read a selection from another app, select text there and choose Read selected text from the VoiceVision menu bar. Some apps do not share selected text.").font(.callout).foregroundStyle(.secondary)
                    }.padding(8)
                }
                HStack {
                    TextField("Try larger text or less glare", text: $command).onSubmit(submit)
                    Button("Apply", action: submit)
                }
                VoiceControl(model: model, speech: model.speech)
                Text(model.status).accessibilityAddTraits(.updatesFrequently).textSelection(.enabled)
                GroupBox("macOS accessibility") {
                    VStack(alignment: .leading, spacing: 10) {
                        Button("Open system Zoom settings") { model.settings("Seeing_Zoom") }
                        Button("Open system Display settings") { model.settings("Seeing_Display") }
                        Text("macOS provides magnification and display accessibility. Opening settings does not enable them. Reader text changes apply inside VoiceVision; the browser extension can also reflow website text.").font(.callout).foregroundStyle(.secondary)
                    }.padding(8)
                }
                DisclosureGroup("Privacy and permissions") {
                    Text("Text is read only when you choose a reading action. No screen recording, cloud commands or background clipboard monitoring. Selected-text access may need Accessibility permission in System Settings → Privacy & Security. Voice is optional and requires speech/microphone permission; only on-device recognition is used. Quit removes overlays. VoiceVision has not been clinically validated.").font(.callout).padding(.top, 8)
                }
            }.padding(28)
        }.onDisappear { model.speech.cancel() }
    }
    private func submit() { guard !command.trimmingCharacters(in: .whitespaces).isEmpty else { return }; model.command(command); command = "" }
    private func adjustment(_ label: String, key: WritableKeyPath<VoiceVisionCore.Settings, Double>, range: ClosedRange<Double>, step: Double) -> some View {
        VStack(alignment: .leading) {
            Text("\(label): \(model.history.current[keyPath: key], specifier: "%.2f")")
            Slider(value: Binding(get: { model.history.current[keyPath: key] }, set: { value in model.change { $0[keyPath: key] = value } }), in: range, step: step) { Text(label) }
        }
    }
}

struct VoiceControl: View {
    @ObservedObject var model: AppModel
    @ObservedObject var speech: LocalSpeech
    var body: some View {
        VStack(alignment: .leading) {
            Button(speech.listening || speech.requestingPermission ? "Cancel voice input" : "Speak a command") {
                if speech.listening || speech.requestingPermission { speech.cancel() } else { speech.start(onResult: model.command) }
            }
            if !speech.error.isEmpty { Text(speech.error).foregroundStyle(.secondary).accessibilityAddTraits(.updatesFrequently) }
            Text("Optional voice stays on device. Typing and buttons always work.").font(.caption).foregroundStyle(.secondary)
        }
    }
}

struct Reader: View {
    @ObservedObject var model: AppModel
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Button("Paste from clipboard") { model.paste() }
                Button("Larger text") { model.change { $0.textSize += 4 } }
                Button("Smaller text") { model.change { $0.textSize -= 4 } }
                Button("Read aloud") { model.readAloud() }
                Button("Stop reading") { model.stopReading() }
            }
            ScrollView {
                Text(model.text).font(.system(size: model.history.current.textSize))
                    .lineSpacing(model.history.current.spacing).textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading).padding(24)
            }.background(Color(nsColor: .textBackgroundColor)).clipShape(RoundedRectangle(cornerRadius: 12))
            Text(model.status).font(.callout).foregroundStyle(.secondary).accessibilityAddTraits(.updatesFrequently)
        }.padding(24)
    }
}
