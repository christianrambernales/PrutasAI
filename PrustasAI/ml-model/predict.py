"""
PrutasAI Predictor - Two-Stage YOLO11n Detection Pipeline

Stage 1: Fruit Classification (dragon fruit, banana, papaya, orange, mango)
Stage 2: Disease Detection with region encircling and Grad-CAM XAI
"""

import os
import cv2
import numpy as np
from pathlib import Path

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("[PrutasAI] Warning: ultralytics not installed. Using mock predictions.")

from severity import classify_severity
from gradcam import GradCAM

# Model weight file paths
MODEL_DIR = Path(__file__).parent / 'model'
FRUIT_CLASSIFIER_PATH = MODEL_DIR / 'fruit_classifier.pt'
DISEASE_DETECTOR_PATH = MODEL_DIR / 'disease_detector.pt'
OUTPUT_DIR = Path(__file__).parent / 'output'

# Fruit class mapping
FRUIT_CLASSES = {
    0: 'mango',
    1: 'capsicum',
    2: 'banana',
    3: 'papaya',
    4: 'orange'
}

# Confidence threshold
CONFIDENCE_THRESHOLD = 0.5


class PrutasAIPredictor:
    """
    Two-stage YOLO11n predictor for fruit disease detection.
    
    Pipeline:
      1. Classify fruit type from 5 classes
      2. Detect disease and affected region
      3. Encircle the affected region (ellipse overlay)
      4. Generate Grad-CAM heatmap (XAI)
      5. Classify severity based on area proportion
    """
    
    def __init__(self):
        self.fruit_classifier = None
        self.disease_detector = None
        self.gradcam = None
        
        # Create output directory
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        
        self._load_models()
    
    def _load_models(self):
        """Load YOLO11n model weights."""
        if not YOLO_AVAILABLE:
            print("[PrutasAI] Running in mock mode — no YOLO models loaded.")
            return
        
        if FRUIT_CLASSIFIER_PATH.exists():
            print(f"[PrutasAI] Loading fruit classifier: {FRUIT_CLASSIFIER_PATH}")
            self.fruit_classifier = YOLO(str(FRUIT_CLASSIFIER_PATH))
        else:
            print(f"[PrutasAI] Warning: Fruit classifier not found at {FRUIT_CLASSIFIER_PATH}")
        
        if DISEASE_DETECTOR_PATH.exists():
            print(f"[PrutasAI] Loading disease detector: {DISEASE_DETECTOR_PATH}")
            self.disease_detector = YOLO(str(DISEASE_DETECTOR_PATH))
            self.gradcam = GradCAM(self.disease_detector)
        else:
            print(f"[PrutasAI] Warning: Disease detector not found at {DISEASE_DETECTOR_PATH}")
    
    def predict(self, image_path):
        """
        Run the full two-stage detection pipeline.
        
        Args:
            image_path: Path to the input fruit image
        
        Returns:
            dict with detection results including:
              - fruit_type, fruit_confidence
              - disease, disease_confidence, is_healthy
              - detection_region (bounding box)
              - severity, severity_percentage
              - encircled_image_path
              - heatmap_image_path
        """
        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        h, w = image.shape[:2]
        base_name = Path(image_path).stem
        
        # === Stage 1: Fruit Classification ===
        fruit_result = self._classify_fruit(image)
        
        if fruit_result['confidence'] < CONFIDENCE_THRESHOLD:
            return {
                'fruit_type': 'unknown',
                'fruit_confidence': fruit_result['confidence'],
                'disease': None,
                'disease_confidence': 0,
                'is_healthy': False,
                'detection_region': {},
                'severity': 'healthy',
                'severity_percentage': 0,
                'encircled_image_path': None,
                'heatmap_image_path': None,
                'error': 'Low confidence in fruit classification. Please retake the image.'
            }
        
        # === Stage 2: Disease Detection ===
        disease_result = self._detect_disease(image)
        
        # === Generate output images ===
        encircled_path = None
        heatmap_path = None
        
        if not disease_result['is_healthy'] and disease_result['region']:
            # Draw encircling overlay on the detected disease region
            encircled_path = str(OUTPUT_DIR / f'{base_name}_encircled.jpg')
            self._draw_encircled(image, disease_result['region'], encircled_path)
            
            # Generate Grad-CAM heatmap
            heatmap_path = str(OUTPUT_DIR / f'{base_name}_heatmap.jpg')
            self._generate_heatmap(image, heatmap_path)
        
        # === Severity Classification ===
        severity_result = classify_severity(
            disease_result['region'], w, h
        ) if disease_result['region'] else {'severity': 'healthy', 'percentage': 0}
        
        return {
            'fruit_type': fruit_result['class_name'],
            'fruit_confidence': round(fruit_result['confidence'], 4),
            'disease': disease_result['disease'] if not disease_result['is_healthy'] else 'healthy',
            'disease_confidence': round(disease_result['confidence'], 4),
            'is_healthy': disease_result['is_healthy'],
            'detection_region': disease_result['region'] or {},
            'severity': severity_result['severity'] if not disease_result['is_healthy'] else 'healthy',
            'severity_percentage': severity_result['percentage'],
            'encircled_image_path': encircled_path,
            'heatmap_image_path': heatmap_path
        }
    
    def _classify_fruit(self, image):
        """Stage 1: Classify the fruit type."""
        if self.fruit_classifier is None:
            # Mock response when model not loaded
            return {'class_name': 'mango', 'class_id': 4, 'confidence': 0.85}
        
        results = self.fruit_classifier(image, verbose=False)
        
        if len(results) == 0:
            return {'class_name': 'unknown', 'class_id': -1, 'confidence': 0.0}
        
        result = results[0]
        
        # For classification model
        if hasattr(result, 'probs') and result.probs is not None:
            top_class = int(result.probs.top1)
            confidence = float(result.probs.top1conf)
            class_name = FRUIT_CLASSES.get(top_class, 'unknown')
            return {'class_name': class_name, 'class_id': top_class, 'confidence': confidence}
        
        # For detection model used as classifier (take highest confidence)
        if len(result.boxes) > 0:
            best_idx = result.boxes.conf.argmax()
            class_id = int(result.boxes.cls[best_idx])
            confidence = float(result.boxes.conf[best_idx])
            class_name = FRUIT_CLASSES.get(class_id, 'unknown')
            return {'class_name': class_name, 'class_id': class_id, 'confidence': confidence}
        
        return {'class_name': 'unknown', 'class_id': -1, 'confidence': 0.0}
    
    def _detect_disease(self, image):
        """Stage 2: Detect disease and locate affected region."""
        if self.disease_detector is None:
            # Disease model is still training, return a safe bypass response
            return {
                'disease': 'training_in_progress',
                'confidence': 0.0,
                'is_healthy': True, # Set to true to bypass heatmap/remedy logic for now
                'region': None
            }
        
        results = self.disease_detector(image, verbose=False)
        
        if len(results) == 0 or len(results[0].boxes) == 0:
            return {
                'disease': 'healthy',
                'confidence': 1.0,
                'is_healthy': True,
                'region': None
            }
        
        result = results[0]
        best_idx = result.boxes.conf.argmax()
        
        box = result.boxes.xyxy[best_idx].cpu().numpy()
        x1, y1, x2, y2 = map(int, box)
        
        class_id = int(result.boxes.cls[best_idx])
        confidence = float(result.boxes.conf[best_idx])
        disease_name = result.names.get(class_id, 'unknown_disease')
        
        # Check if the class is "healthy"
        is_healthy = 'healthy' in disease_name.lower()
        
        return {
            'disease': disease_name,
            'confidence': confidence,
            'is_healthy': is_healthy,
            'region': {
                'x': x1,
                'y': y1,
                'width': x2 - x1,
                'height': y2 - y1
            }
        }
    
    def _draw_encircled(self, image, region, output_path):
        """
        Draw an encircling ellipse overlay on the detected disease region.
        Uses ellipse instead of rectangle per thesis specification.
        """
        output = image.copy()
        
        cx = region['x'] + region['width'] // 2
        cy = region['y'] + region['height'] // 2
        ax_x = region['width'] // 2 + 10  # slight padding
        ax_y = region['height'] // 2 + 10
        
        # Draw semi-transparent red ellipse
        overlay = output.copy()
        cv2.ellipse(overlay, (cx, cy), (ax_x, ax_y), 0, 0, 360, (0, 0, 255), 3)
        cv2.addWeighted(overlay, 0.8, output, 0.2, 0, output)
        
        # Draw solid ellipse border
        cv2.ellipse(output, (cx, cy), (ax_x, ax_y), 0, 0, 360, (0, 0, 255), 2)
        
        cv2.imwrite(output_path, output)
    
    def _generate_heatmap(self, image, output_path):
        """Generate and save Grad-CAM heatmap overlay."""
        if self.gradcam is None:
            # Save original as placeholder
            cv2.imwrite(output_path, image)
            return
        
        try:
            overlay = self.gradcam.generate_overlay(image, alpha=0.4)
            cv2.imwrite(output_path, overlay)
        except Exception as e:
            print(f"[PrutasAI] Heatmap generation error: {e}")
            cv2.imwrite(output_path, image)
