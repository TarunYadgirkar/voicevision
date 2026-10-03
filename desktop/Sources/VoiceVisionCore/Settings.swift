import Foundation

public enum CommandResult: Equatable { case changed, unchanged, unknown }

public struct Settings: Codable, Equatable, Sendable {
    public var screenEnabled: Bool
    public var dim: Double
    public var warmth: Double
    public var textSize: Double
    public var spacing: Double

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
    }

    public mutating func apply(_ phrase: String) -> CommandResult {
        let text = phrase.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        if text.contains("do not") || text.contains("don't") || text.contains("never ") || text.hasPrefix("no ") { return .unchanged }
        let before = self
        if ["reset", "reset all", "back to normal"].contains(text) { self = Settings(); return before == self ? .unchanged : .changed }
        var recognized = false
        if text.contains("larger text") || text.contains("bigger text") { textSize += 4; recognized = true }
        if text.contains("smaller text") { textSize -= 4; recognized = true }
        if text.contains("more spacing") { spacing += 4; recognized = true }
        if text.contains("less spacing") { spacing -= 4; recognized = true }
        if text.contains("less glare") || text == "dim screen" { dim += 0.1; recognized = true }
        if text == "brighter screen" { dim -= 0.1; recognized = true }
        if text == "warm tint" { warmth = 0.12; recognized = true }
        if text == "remove tint" { warmth = 0; recognized = true }
        normalize()
        if recognized { return before == self ? .unchanged : .changed }
        if ["blind", "glaucoma", "macular", "hemianopia", "migraine", "photophobia", "cataract", "low vision"].contains(where: text.contains) { return .unchanged }
        return .unknown
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
