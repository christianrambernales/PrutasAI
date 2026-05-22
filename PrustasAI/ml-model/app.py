"""
PrutasAI ML Service - Flask API

Provides REST endpoints for the two-stage fruit disease detection pipeline:
  - /api/predict: Full pipeline (classify fruit → detect disease → severity → XAI)
  - /api/health: Service health check
"""

import os
import uuid
from pathlib import Path
from flask import Flask, request, jsonify, send_file

from predict import PrutasAIPredictor

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max upload

UPLOAD_DIR = Path(__file__).parent / 'uploads'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Initialize predictor
predictor = PrutasAIPredictor()


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'PrutasAI ML Service',
        'models': {
            'fruit_classifier': predictor.fruit_classifier is not None,
            'disease_detector': predictor.disease_detector is not None
        }
    })


@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Full detection pipeline endpoint.
    
    Accepts: multipart/form-data with 'image' file
    Returns: JSON with detection results
    """
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided.'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Empty filename.'}), 400
    
    # Validate file type
    allowed = {'jpg', 'jpeg', 'png', 'webp'}
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in allowed:
        return jsonify({'error': f'Invalid file type. Allowed: {", ".join(allowed)}'}), 400
    
    # Save uploaded file
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    file.save(str(filepath))
    
    try:
        # Run prediction pipeline
        result = predictor.predict(str(filepath))
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up uploaded file (output images are kept)
        try:
            filepath.unlink(missing_ok=True)
        except Exception:
            pass


@app.route('/api/image/<path:filename>', methods=['GET'])
def serve_image(filename):
    """Serve generated output images (encircled, heatmap)."""
    output_dir = Path(__file__).parent / 'output'
    filepath = output_dir / filename
    
    if not filepath.exists():
        return jsonify({'error': 'Image not found.'}), 404
    
    return send_file(str(filepath), mimetype='image/jpeg')


if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5000))
    print(f"""
╔═══════════════════════════════════════════════╗
║          🧠 PrutasAI ML Service 🧠            ║
║  YOLOv11n Fruit Disease Detection Pipeline    ║
║  Running on port {port}                         ║
╚═══════════════════════════════════════════════╝
    """)
    app.run(host='0.0.0.0', port=port, debug=True)
