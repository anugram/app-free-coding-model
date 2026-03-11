# Role: Edge AI / Systems Integration Engineer
# Epic 4: On-Device Generative Assistant for "AegisNote"

## Objective
Implement a local generative Small Language Model (SLM) to replace all cloud-based LLM functionality. This engine must process user prompts and generate text (summaries, action items) entirely on-device, ensuring zero data egress.

## Tech Stack
* **Inference Engine:** `MLC LLM` or `llama.cpp` bindings for React Native/Flutter.
* **Model:** A heavily quantized (4-bit integer) instruction-tuned model (e.g., Phi-3-mini-4k-instruct-q4 or similar).
* **Hardware Acceleration:** Metal Performance Shaders (iOS) and Vulkan/OpenCL (Android).

## Epic Requirements
1. **Engine Integration:** Compile and integrate the local inference engine into the cross-platform project. Ensure the engine interfaces directly with the native mobile GPUs.
2. **Inference Optimization:** To make local generation viable without creating thermal throttling or severe battery drain, the architecture must handle the compute-heavy prefilling phase of LLM inference efficiently. The engine must utilize highly optimized GEMM (General Matrix Multiply) kernels tailored for mobile architectures.
3. **Model Management:** Build a download manager to fetch the quantized model weights (typically 1.5GB - 2GB) from a secure CDN on first launch, storing them in the device's local filesystem. 
4. **Memory Orchestration:** Running the Sensitive Data Discovery (SDD) classifier and the generative SLM simultaneously will crash most devices. Implement a strict memory orchestrator: 
    - Unload the SDD model from RAM.
    - Load the Generative SLM weights into RAM.
    - Execute the prompt and stream the response to the UI.
    - Unload the Generative SLM and reload the SDD model.

## Your First Task
Set up the inference engine wrapper. Write the `LocalLLMService` module using `llama.cpp` or `MLC LLM` bindings. Implement an `initialize()` function that loads a dummy GGUF model from the local filesystem, and a `generate(prompt: string)` function that returns a stream of tokens back to the UI thread without blocking the main event loop.
