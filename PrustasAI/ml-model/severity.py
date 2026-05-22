"""
PrutasAI Severity Classification Module

Computes the proportion of the image covered by the detected disease region
and classifies severity into Early, Moderate, or Severe.
"""

def classify_severity(detection_region, image_width, image_height):
    """
    Classify disease severity based on the proportion of the image
    covered by the detected disease region.
    
    Thresholds (per thesis algorithm):
      - Early:    < 15% of fruit area affected
      - Moderate: 15% - 40% of fruit area affected
      - Severe:   > 40% of fruit area affected
    
    Args:
        detection_region: dict with keys 'x', 'y', 'width', 'height'
        image_width: total image width in pixels
        image_height: total image height in pixels
    
    Returns:
        dict with 'severity' (str) and 'percentage' (float)
    """
    if not detection_region or image_width == 0 or image_height == 0:
        return {'severity': 'healthy', 'percentage': 0.0}
    
    # Calculate area proportion
    region_area = detection_region.get('width', 0) * detection_region.get('height', 0)
    total_area = image_width * image_height
    
    if total_area == 0:
        return {'severity': 'healthy', 'percentage': 0.0}
    
    percentage = (region_area / total_area) * 100
    
    # Classify based on thresholds
    if percentage < 15:
        severity = 'early'
    elif percentage <= 40:
        severity = 'moderate'
    else:
        severity = 'severe'
    
    return {
        'severity': severity,
        'percentage': round(percentage, 2)
    }


def classify_severity_from_mask(mask_pixels, total_pixels):
    """
    Alternative severity classification using segmentation mask pixel count.
    
    Args:
        mask_pixels: number of pixels in the disease mask
        total_pixels: total number of pixels in the image
    
    Returns:
        dict with 'severity' (str) and 'percentage' (float)
    """
    if total_pixels == 0:
        return {'severity': 'healthy', 'percentage': 0.0}
    
    percentage = (mask_pixels / total_pixels) * 100
    
    if percentage < 15:
        severity = 'early'
    elif percentage <= 40:
        severity = 'moderate'
    else:
        severity = 'severe'
    
    return {
        'severity': severity,
        'percentage': round(percentage, 2)
    }
