
import { useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";

export interface DetectedFace {
  box: faceapi.Box;
  descriptor: Float32Array;
  detection: faceapi.FaceDetection;
}

export const useFaceApi = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  // Load face-api.js models from recommended CDN
  const loadModels = useCallback(async () => {
    if (modelsLoaded || loadingModels) return;
    setLoadingModels(true);
    try {
      // You can optimize by hosting these models yourself if needed
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js/weights";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    } catch (e) {
      setModelsLoaded(false);
      throw e;
    } finally {
      setLoadingModels(false);
    }
  }, [modelsLoaded, loadingModels]);

  // Perform detection on a video or canvas element
  const detectFace = useCallback(
    async (inputEl: HTMLVideoElement | HTMLCanvasElement) => {
      if (!modelsLoaded) throw new Error("Face-api.js models not loaded");
      // Use the tinyFaceDetector for speed
      const detections = await faceapi
        .detectAllFaces(inputEl, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();
      if (!detections || detections.length === 0) return [];
      // Extract the best face only (usually closest/biggest)
      return detections.map((res) => ({
        box: res.detection.box,
        descriptor: res.descriptor,
        detection: res.detection,
      }));
    },
    [modelsLoaded]
  );

  // Compare face descriptors (Euclidean distance, threshold typically 0.5)
  const compareDescriptors = useCallback(
    (desc1: Float32Array, desc2: Float32Array): number => {
      if (!desc1 || !desc2) return 0;
      let sum = 0;
      for (let i = 0; i < desc1.length; i++) {
        const diff = desc1[i] - desc2[i];
        sum += diff * diff;
      }
      return Math.sqrt(sum);
    },
    []
  );

  return {
    loadModels,
    modelsLoaded,
    loadingModels,
    detectFace,
    compareDescriptors,
  };
};

