import XCTest
@testable import VoiceVisionCore
final class SettingsTests: XCTestCase {
    func testCompoundReaderCommandsDoNotEnableScreen() {
        var settings = Settings()
        XCTAssertEqual(settings.apply("dark mode, bold text and more letter spacing"), .changed)
        XCTAssertEqual(settings.theme, .dark)
        XCTAssertTrue(settings.bold)
        XCTAssertEqual(settings.letterSpacing, 1)
        XCTAssertFalse(settings.screenEnabled)
        XCTAssertEqual(settings.apply("high contrast and narrower lines"), .changed)
        XCTAssertEqual(settings.theme, .contrast)
        XCTAssertEqual(settings.lineWidth, 580)
    }
    func testReaderAndSpeechBounds() {
        var settings = Settings()
        settings.letterSpacing = 100; settings.lineWidth = -10; settings.speechRate = .infinity
        settings.normalize()
        XCTAssertEqual(settings.letterSpacing, 6)
        XCTAssertEqual(settings.lineWidth, 320)
        XCTAssertEqual(settings.speechRate, 0.5)
        XCTAssertEqual(settings.apply("slower speech"), .changed)
        XCTAssertEqual(settings.speechRate, 0.45, accuracy: 0.001)
    }
    func testCompoundScreenAndReaderCommand() {
        var settings = Settings()
        XCTAssertEqual(settings.apply("dark mode and warm tint"), .changed)
        XCTAssertEqual(settings.theme, .dark)
        XCTAssertEqual(settings.warmth, 0.12)
        XCTAssertEqual(settings.apply("remove tint and regular text"), .changed)
        XCTAssertEqual(settings.warmth, 0)
    }
    func testOldPreferencesKeepAdjustmentsAndGainDefaults() throws {
        let data = Data(#"{"screenEnabled":true,"dim":0.2,"warmth":0.1,"textSize":30,"spacing":12}"#.utf8)
        let settings = try JSONDecoder().decode(Settings.self, from: data)
        XCTAssertEqual(settings.dim, 0.2)
        XCTAssertEqual(settings.textSize, 30)
        XCTAssertEqual(settings.theme, .system)
        XCTAssertEqual(settings.font, .system)
        XCTAssertEqual(settings.speechRate, 0.5)
    }
    func testPresetUndoRestoresAllPreferences() {
        var history = SettingsHistory()
        history.change { $0.dim = 0.2; $0.screenEnabled = true }
        let before = history.current
        history.change { $0.applyPreset(.reading) }
        XCTAssertEqual(history.current.textSize, 30)
        XCTAssertTrue(history.current.bold)
        XCTAssertEqual(history.current.dim, 0.2)
        history.undo()
        XCTAssertEqual(history.current, before)
    }
    func testUndoRestoresScreenEnableAfterReset() {
        var history = SettingsHistory()
        history.change { $0.dim = 0.2; $0.screenEnabled = true }
        history.reset()
        XCTAssertFalse(history.current.screenEnabled)
        history.undo()
        XCTAssertTrue(history.current.screenEnabled)
        XCTAssertEqual(history.current.dim, 0.2)
    }
    func testNegationDoesNotChangePreferences() {
        var settings = Settings()
        XCTAssertEqual(settings.apply("do not use less glare"), .unchanged)
        XCTAssertEqual(settings.apply("don't make smaller text"), .unchanged)
        XCTAssertEqual(settings, Settings())
        for command in ["turn off dark mode", "disable high contrast", "turn off bold text", "remove warm tint", "remove sepia", "switch off dark mode", "warm tint off", "without bold text"] {
            XCTAssertEqual(settings.apply(command), .unchanged)
            XCTAssertEqual(settings, Settings())
        }
    }
    func testVoiceChoiceSavesAndParticipatesInUndoAndReset() throws {
        var history = SettingsHistory()
        history.change { $0.voiceIdentifier = "test-local-voice" }
        let data = try JSONEncoder().encode(history.current)
        XCTAssertEqual(try JSONDecoder().decode(Settings.self, from: data).voiceIdentifier, "test-local-voice")
        history.reset()
        XCTAssertEqual(history.current.voiceIdentifier, "")
        history.undo()
        XCTAssertEqual(history.current.voiceIdentifier, "test-local-voice")
    }
    func testBoundsAndNonFiniteValues() {
        let settings = Settings(dim: .infinity, warmth: -1, textSize: 100, spacing: .nan)
        XCTAssertEqual(settings.dim, 0)
        XCTAssertEqual(settings.warmth, 0)
        XCTAssertEqual(settings.textSize, 48)
        XCTAssertEqual(settings.spacing, 8)
    }
    func testDiagnosisNeverChoosesScreenChanges() {
        var settings = Settings()
        XCTAssertEqual(settings.apply("I have glaucoma"), .unchanged)
        XCTAssertEqual(settings, Settings())
        XCTAssertEqual(settings.apply("I have migraine, larger text"), .changed)
        XCTAssertEqual(settings.textSize, 26)
        XCTAssertEqual(settings.dim, 0)
        XCTAssertEqual(settings.warmth, 0)
    }
    func testUndoSurvivesRepeatedNoOp() {
        var history = SettingsHistory()
        history.change { $0.dim = 0.2 }
        history.change { $0.dim = 0.2 }
        history.undo()
        XCTAssertEqual(history.current.dim, 0)
    }
    func testResetAndBoundsAfterChanges() {
        var history = SettingsHistory()
        history.change { $0.textSize = 500 }
        XCTAssertEqual(history.current.textSize, 48)
        history.reset()
        XCTAssertEqual(history.current, Settings())
        history.undo()
        XCTAssertEqual(history.current.textSize, 48)
    }
}
