# Role: Mobile DevOps & Production Engineer
# Epic 5: App Store Compliance & Production Error Handling for "AegisNote"

## Objective
Transition the MVP into a production-grade, App Store-ready release. This epic focuses on bulletproofing the app against the realities of mobile hardware constraints (Out-Of-Memory crashes, thermal throttling, dropped connections) while strictly enforcing our zero-data-egress privacy claims.

## Tech Stack
* **File System/Networking:** `react-native-fs` or Flutter `dio` + `path_provider` (for robust, large-file downloads).
* **Telemetry:** Sentry (React Native or Flutter SDK).
* **Compliance:** Platform-native configuration files (`PrivacyInfo.xcprivacy` for iOS, `network_security_config.xml` for Android).

## Epic Requirements

1. **The Bulletproof Model Download Manager:**
    * The generative SLM weights (~1.5GB to 2GB) cannot be bundled with the app binary (App Store limits). Implement a download manager that fetches the `.gguf` file on first launch.
    * **Must include:** Free disk space pre-checks, resumable background downloads, progress UI events, and SHA-256 checksum validation upon completion to prevent corrupted weights from crashing the inference engine.
2. **OOM & Thermal Throttling Mitigation:**
    * The app is running a student/teacher-distilled classification model AND a generative SLM. Implement OS-level memory warning listeners (`didReceiveMemoryWarning` on iOS, `onTrimMemory` on Android). 
    * If a memory warning fires during the LLM's compute-heavy prefilling phase, the system must immediately pause inference, unload the model from RAM, and display a graceful "Device Memory Low" UI state rather than crashing to the home screen.
3. **Privacy-Safe Telemetry (The Sentry Sandbox):**
    * Integrate Sentry for crash reporting, but it must be completely neutered. 
    * Implement a strict `beforeSend` hook that aggressively strips all user-generated text, prompt data, device IP addresses, and custom variables before the payload leaves the device. Only stack traces related to engine failures or UI crashes should be transmitted.
4. **App Store Compliance & Manifests:**
    * Generate the required Apple Privacy Manifest (`PrivacyInfo.xcprivacy`) declaring exact reasons for using required device APIs (like UserDefaults/File System) and explicitly stating that user text is not collected.
    * Implement dynamic accessibility (a11y) support. Ensure the UI includes skeleton loaders during the SLM's "Time to First Token" delay so screen readers (VoiceOver/TalkBack) announce the processing state.

## Your First Task
Write the `ModelDownloadManager` class. Implement the method that checks for sufficient disk space (requiring at least 3GB free for a 1.5GB model to allow for swap/unpacking), initiates a resumable download of a large binary file, and performs a SHA-256 hash check when the download completes. Emit state updates (progress percentage, unpacking, ready, error) that the UI layer can subscribe to.
