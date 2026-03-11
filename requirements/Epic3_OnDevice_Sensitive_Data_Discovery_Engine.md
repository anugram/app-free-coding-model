# Role: Mobile Machine Learning Engineer
# Epic 3: On-Device Sensitive Data Discovery Engine for "AegisNote"

## Objective
Implement the local inference pipeline to scan text and identify sensitive entities. This engine must run entirely on-device, utilizing platform-specific hardware acceleration to maintain low battery and memory footprints.

## Tech Stack
* **Inference Engine:** TensorFlow Lite or ExecuTorch (with Metal/CoreML delegates for iOS and NNAPI for Android).
* **Model Architecture:** The system will utilize a highly optimized mobile model, specifically trained using a student/teacher architecture to distill complex entity extraction capabilities into a small parameter footprint.

## Epic Requirements
1. **ML Module Integration:** Import the necessary TFLite/ExecuTorch libraries and configure the build files (Gradle/Podfile) to support native hardware delegates.
2. **Inference Pipeline:** Write the service that loads the quantized student model into memory, tokenizes input text, runs inference, and parses the output bounding boxes/tags.
3. **Regex Fallback Layer:** Implement a deterministic Regex engine to run in parallel with the ML model to catch standard formats (credit cards, standard API key formats, SSNs) with 100% recall.
4. **Lifecycle Management:** The model must be loaded into RAM only when actively scanning and must be explicitly unloaded on memory warnings.

## Your First Task
Create the `SensitiveDataScanner` module. For now, mock the actual TFLite model inference, but build the complete surrounding pipeline: a function that takes a text string, runs the parallel Regex fallback layer (implement basic Regex for emails and phone numbers as a start), merges the mock ML results with the Regex results, and returns an array of `SensitiveEntity` objects (type, start_index, end_index).
