// swift-tools-version: 6.0
import PackageDescription
let package = Package(
    name: "VoiceVisionDesktop",
    platforms: [.macOS(.v13)],
    products: [.executable(name: "VoiceVision", targets: ["VoiceVisionMac"])],
    targets: [
        .target(name: "VoiceVisionCore"),
        .executableTarget(name: "VoiceVisionMac", dependencies: ["VoiceVisionCore"]),
        .testTarget(name: "VoiceVisionCoreTests", dependencies: ["VoiceVisionCore"])
    ]
)
