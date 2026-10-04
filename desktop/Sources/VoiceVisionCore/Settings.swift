import Foundation

public enum CommandResult: Equatable { case changed, unchanged, unknown }

public enum ReaderTheme: String, Codable, CaseIterable, Sendable { case system, light, dark, sepia, contrast }
public enum ReaderFont: String, Codable, CaseIterable, Sendable { case system, serif, rounded, mono }
public enum ReadingPreset: String, CaseIterable, Sendable { case reading, glare, contrast }

public struct Settings: Codable, Equatable, Sendable {
    public var screenEnabled: Bool
    public var dim: Double
    public var warmth: Double
    public var textSize: Double
    public var spacing: Double

    public var theme: ReaderTheme = .system
    public var font: ReaderFont = .system
    public var bold = false
    public var letterSpacing = 0.0
    public var lineWidth = 680.0
    public var speechRate = 0.5
    public var voiceIdentifier = ""

    private enum CodingKeys: String, CodingKey {
        case screenEnabled, dim, warmth, textSize, spacing, theme, font, bold, letterSpacing, lineWidth, speechRate, voiceIdentifier
    }
    public init(from decoder: Decoder) throws {
        self.init()
        let c = try decoder.container(keyedBy: CodingKeys.self)
        screenEnabled = try c.decodeIfPresent(Bool.self, forKey: .screenEnabled) ?? false
        dim = try c.decodeIfPresent(Double.self, forKey: .dim) ?? 0
        warmth = try c.decodeIfPresent(Double.self, forKey: .warmth) ?? 0
        textSize = try c.decodeIfPresent(Double.self, forKey: .textSize) ?? 22
        spacing = try c.decodeIfPresent(Double.self, forKey: .spacing) ?? 8
        theme = try c.decodeIfPresent(ReaderTheme.self, forKey: .theme) ?? .system
        font = try c.decodeIfPresent(ReaderFont.self, forKey: .font) ?? .system
        bold = try c.decodeIfPresent(Bool.self, forKey: .bold) ?? false
        letterSpacing = try c.decodeIfPresent(Double.self, forKey: .letterSpacing) ?? 0
        lineWidth = try c.decodeIfPresent(Double.self, forKey: .lineWidth) ?? 680
        speechRate = try c.decodeIfPresent(Double.self, forKey: .speechRate) ?? 0.5
        voiceIdentifier = try c.decodeIfPresent(String.self, forKey: .voiceIdentifier) ?? ""
        normalize()
    }

    public init(screenEnabled: Bool = false, dim: Double = 0, warmth: Double = 0, textSize: Double = 22, spacing: Double = 8) {
        self.screenEnabled = screenEnabled
        self.dim = dim; self.warmth = warmth; self.textSize = textSize; self.spacing = spacing
        normalize()
    }

    public mutating func normalize() {
        dim = bounded(dim, 0...0.45, fallback: 0)
        warmth = bounded(warmth, 0...0.25, fallback: 0)
        textSize = bounded(textSize, 16...48, fallback: 22)
        spacing = bounded(spacing, 0...24, fallback: 8)
        letterSpacing = bounded(letterSpacing, 0...6, fallback: 0)
        lineWidth = bounded(lineWidth, 320...1000, fallback: 680)
        speechRate = bounded(speechRate, 0.2...0.65, fallback: 0.5)
    }

    public mutating func apply(_ phrase: String) -> CommandResult {
        let text = phrase.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        if text.contains("do not") || text.contains("don't") || text.contains("never ") || text.hasPrefix("no ") || text.contains("off ") || text.hasSuffix(" off") || text.contains("disable ") || text.contains("without ") || text.contains("avoid ") || text.contains("stop ") { return .unchanged }
        let removal = text.replacingOccurrences(of: "remove tint", with: "").replacingOccurrences(of: "remove bold", with: "")
        if removal.contains("remove ") { return .unchanged }
        let before = self
        if ["reset", "reset all", "back to normal"].contains(text) { self = Settings(); return before == self ? .unchanged : .changed }
        var recognized = false
        if text.contains("larger text") || text.contains("bigger text") { textSize += 4; recognized = true }
        if text.contains("smaller text") { textSize -= 4; recognized = true }
        if text.contains("dark mode") { theme = .dark; recognized = true }
        if text.contains("light mode") { theme = .light; recognized = true }
        if text.contains("sepia") { theme = .sepia; recognized = true }
        if text.contains("high contrast") || text.contains("stronger contrast") { theme = .contrast; recognized = true }
        if text.contains("system theme") { theme = .system; recognized = true }
        if text.contains("bold text") { bold = true; recognized = true }
        if text.contains("regular text") || text.contains("remove bold") { bold = false; recognized = true }
        if text.contains("more letter spacing") { letterSpacing += 1; recognized = true }
        if text.contains("less letter spacing") { letterSpacing -= 1; recognized = true }
        if text.contains("narrower lines") { lineWidth -= 100; recognized = true }
        if text.contains("wider lines") { lineWidth += 100; recognized = true }
        if text.contains("slower speech") { speechRate -= 0.05; recognized = true }
        if text.contains("faster speech") { speechRate += 0.05; recognized = true }
        if text.contains("more spacing") { spacing += 4; recognized = true }
        if text.contains("less spacing") { spacing -= 4; recognized = true }
        if text.contains("less glare") || text.contains("dim screen") { dim += 0.1; recognized = true }
        if text.contains("brighter screen") { dim -= 0.1; recognized = true }
        if text.contains("warm tint") { warmth = 0.12; recognized = true }
        if text.contains("remove tint") { warmth = 0; recognized = true }
        normalize()
        if recognized { return before == self ? .unchanged : .changed }
        if ["blind", "glaucoma", "macular", "hemianopia", "migraine", "photophobia", "cataract", "low vision"].contains(where: text.contains) { return .unchanged }
        return .unknown
    }

    public mutating func applyPreset(_ preset: ReadingPreset) {
        switch preset {
        case .reading: textSize = 30; spacing = 14; letterSpacing = 1; lineWidth = 580; bold = true
        case .glare: dim = 0.2; warmth = 0.1; screenEnabled = true; theme = .sepia
        case .contrast: theme = .contrast; bold = true
        }
        normalize()
    }

    private func bounded(_ value: Double, _ range: ClosedRange<Double>, fallback: Double) -> Double {
        value.isFinite ? min(range.upperBound, max(range.lowerBound, value)) : fallback
    }
}

public struct SettingsHistory: Sendable {
    public private(set) var current: Settings
    public private(set) var previous: Settings?
    public init(settings: Settings = Settings()) { current = settings; current.normalize() }
    public mutating func change(_ action: (inout Settings) -> Void) {
        var next = current
        action(&next)
        next.normalize()
        guard next != current else { return }
        previous = current
        current = next
    }
    public mutating func undo() { guard let previous else { return }; let next = previous; self.previous = current; current = next }
    public mutating func reset() { change { $0 = Settings() } }
}
