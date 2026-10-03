import XCTest
@testable import VoiceVisionCore
final class SettingsTests: XCTestCase {
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
