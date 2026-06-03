"""
PrutasAI Grad-CAM (Gradient-weighted Class Activation Mapping) Module

Generates visual heatmap explanations of YOLO11n detection results,
highlighting the image regions that influenced the disease detection.
Implements the Explainable AI (XAI) component per thesis requirements.
"""

import cv2
import numpy as np
import torch
import torch.nn.functional as F


class GradCAM:
    """
    Grad-CAM implementation for YOLO11n models.
    Extracts feature maps from target convolutional layers and generates
    color heatmap overlays on the original image.
    """
    
    def __init__(self, model, target_layer=None):
        """
        Args:
            model: Ultralytics YOLO model
            target_layer: Target layer for Grad-CAM extraction.
                          If None, uses the last convolutional layer.
        """
        self.model = model
        self.gradients = None
        self.activations = None
        self.target_layer = target_layer
        self._hooks = []
        
    def _find_target_layer(self):
        """Find the last convolutional layer in the model backbone."""
        target = None
        for name, module in self.model.model.model.named_modules():
            if isinstance(module, torch.nn.Conv2d):
                target = module
        return target
    
    def _register_hooks(self, layer):
        """Register forward and backward hooks on the target layer."""
        def forward_hook(module, input, output):
            self.activations = output.detach()
        
        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach()
        
        self._hooks.append(layer.register_forward_hook(forward_hook))
        self._hooks.append(layer.register_full_backward_hook(backward_hook))
    
    def _remove_hooks(self):
        """Remove all registered hooks."""
        for hook in self._hooks:
            hook.remove()
        self._hooks = []
    
    def generate_heatmap(self, image, class_idx=None):
        """
        Generate Grad-CAM heatmap for the given image.
        
        Args:
            image: numpy array (BGR) or path to image
            class_idx: Target class index. If None, uses the predicted class.
        
        Returns:
            heatmap: numpy array (H, W) with values [0, 1]
            colored_heatmap: numpy array (H, W, 3) BGR colored heatmap
        """
        # Find target layer
        layer = self.target_layer or self._find_target_layer()
        if layer is None:
            return self._fallback_heatmap(image)
        
        self._register_hooks(layer)
        
        try:
            # Run inference with gradients enabled
            self.model.model.model.train()
            
            # Preprocess image
            if isinstance(image, str):
                img = cv2.imread(image)
            else:
                img = image.copy()
            
            h, w = img.shape[:2]
            
            # Use the model's built-in preprocessing
            results = self.model(img, verbose=False)
            
            if len(results) == 0 or len(results[0].boxes) == 0:
                self._remove_hooks()
                return self._fallback_heatmap(img)
            
            # Get the highest confidence detection
            result = results[0]
            boxes = result.boxes
            
            if class_idx is None:
                class_idx = int(boxes.cls[0])
            
            # Generate heatmap from activations and gradients
            if self.activations is not None and self.gradients is not None:
                # Global average pooling of gradients
                weights = torch.mean(self.gradients, dim=[2, 3], keepdim=True)
                
                # Weighted combination of activation maps
                cam = torch.sum(weights * self.activations, dim=1, keepdim=True)
                cam = F.relu(cam)
                
                # Normalize
                cam = cam.squeeze().cpu().numpy()
                cam = cv2.resize(cam, (w, h))
                cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
            else:
                cam = self._generate_simple_heatmap(boxes, w, h)
            
            # Create colored heatmap
            colored = cv2.applyColorMap(
                np.uint8(255 * cam), cv2.COLORMAP_JET
            )
            
            self.model.model.model.eval()
            
            return cam, colored
            
        except Exception as e:
            print(f"[PrutasAI] Grad-CAM generation error: {e}")
            return self._fallback_heatmap(img if isinstance(image, np.ndarray) else cv2.imread(image))
        finally:
            self._remove_hooks()
    
    def _generate_simple_heatmap(self, boxes, width, height):
        """
        Fallback: generate a gaussian heatmap centered on detection boxes.
        """
        heatmap = np.zeros((height, width), dtype=np.float32)
        
        for box in boxes.xyxy:
            x1, y1, x2, y2 = map(int, box.cpu().numpy())
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            sigma_x = (x2 - x1) / 3
            sigma_y = (y2 - y1) / 3
            
            for y in range(max(0, y1), min(height, y2)):
                for x in range(max(0, x1), min(width, x2)):
                    heatmap[y, x] = max(
                        heatmap[y, x],
                        np.exp(-((x - cx)**2 / (2 * sigma_x**2 + 1e-8) +
                                 (y - cy)**2 / (2 * sigma_y**2 + 1e-8)))
                    )
        
        return heatmap
    
    def _fallback_heatmap(self, image):
        """Return a blank heatmap when Grad-CAM cannot be computed."""
        if isinstance(image, str):
            image = cv2.imread(image)
        h, w = image.shape[:2]
        heatmap = np.zeros((h, w), dtype=np.float32)
        colored = cv2.applyColorMap(np.uint8(255 * heatmap), cv2.COLORMAP_JET)
        return heatmap, colored
    
    def generate_overlay(self, image, alpha=0.4):
        """
        Generate a heatmap overlaid on the original image.
        
        Args:
            image: numpy array (BGR) or path to image
            alpha: overlay transparency (0-1)
        
        Returns:
            overlay: numpy array (H, W, 3) BGR image with heatmap overlay
        """
        if isinstance(image, str):
            img = cv2.imread(image)
        else:
            img = image.copy()
        
        _, colored_heatmap = self.generate_heatmap(image)
        
        overlay = cv2.addWeighted(img, 1 - alpha, colored_heatmap, alpha, 0)
        return overlay
