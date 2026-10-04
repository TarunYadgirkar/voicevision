import SwiftUI
import AppKit
import VoiceVisionCore

struct ReaderPreferences: View {
    @ObservedObject var model: AppModel
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading) {
                Picker("Theme", selection: Binding(get: { model.history.current.theme }, set: { value in model.change { $0.theme = value } })) {
                    Text("System").tag(ReaderTheme.system)
                    Text("Light").tag(ReaderTheme.light)
                    Text("Dark").tag(ReaderTheme.dark)
                    Text("Sepia").tag(ReaderTheme.sepia)
                    Text("High contrast").tag(ReaderTheme.contrast)
                }
                Picker("Font", selection: Binding(get: { model.history.current.font }, set: { value in model.change { $0.font = value } })) {
                    Text("System").tag(ReaderFont.system)
                    Text("Serif").tag(ReaderFont.serif)
                    Text("Rounded").tag(ReaderFont.rounded)
                    Text("Monospaced").tag(ReaderFont.mono)
                }
            }
            Toggle("Bold text", isOn: Binding(get: { model.history.current.bold }, set: { value in model.change { $0.bold = value } }))
            adjustment("Text size", key: \.textSize, range: 16...48, step: 2, unit: "pt")
            adjustment("Line spacing", key: \.spacing, range: 0...24, step: 2, unit: "pt")
            adjustment("Letter spacing", key: \.letterSpacing, range: 0...6, step: 0.5, unit: "pt")
            adjustment("Maximum line width", key: \.lineWidth, range: 320...1000, step: 20, unit: "pt")
            Text("These controls format text inside the reader. Lines wrap to fit the window. Choose the combination that works for you.").font(.caption).foregroundStyle(.secondary)
        }
    }
    private func adjustment(_ label: String, key: WritableKeyPath<VoiceVisionCore.Settings, Double>, range: ClosedRange<Double>, step: Double, unit: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(label): \(model.history.current[keyPath: key], specifier: "%.1f") \(unit)")
            Slider(value: Binding(get: { model.history.current[keyPath: key] }, set: { value in model.change { $0[keyPath: key] = value } }), in: range, step: step) { Text(label) }
        }
    }
}

struct ReaderPassage: View {
    @ObservedObject var model: AppModel
    private var settings: VoiceVisionCore.Settings { model.history.current }
    private var foreground: Color {
        switch settings.theme {
        case .system: Color(nsColor: .textColor)
        case .light: .black
        case .dark: .white
        case .sepia: Color(red: 0.2, green: 0.15, blue: 0.1)
        case .contrast: .yellow
        }
    }
    private var background: Color {
        switch settings.theme {
        case .system: Color(nsColor: .textBackgroundColor)
        case .light: .white
        case .dark, .contrast: .black
        case .sepia: Color(red: 0.98, green: 0.93, blue: 0.82)
        }
    }
    private var design: Font.Design {
        switch settings.font { case .system: .default; case .serif: .serif; case .rounded: .rounded; case .mono: .monospaced }
    }
    var body: some View {
        ScrollView {
            Text(model.text).font(.system(size: settings.textSize, weight: settings.bold ? .bold : .regular, design: design))
                .tracking(settings.letterSpacing).lineSpacing(settings.spacing)
                .textSelection(.enabled).foregroundStyle(foreground)
                .frame(maxWidth: settings.lineWidth, alignment: .leading)
                .frame(maxWidth: .infinity, alignment: .center).padding(24)
        }.background(background).clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
