# Model Weights Directory

Place your trained YOLO11n model weights here:

- `fruit_classifier.pt` — Fruit classification model (5 classes: mango, capsicum, banana, papaya, orange)
- `disease_detector.pt` — Disease detection model (per-fruit disease classes)

## Training

Use the notebooks in `/notebooks/` to train these models on Google Colab:

1. `train_fruit_classifier.ipynb` — Train the fruit classification model
2. `train_disease_detector.ipynb` — Train the disease detection model

## Dataset

Prepare your dataset in YOLO format:
```
dataset/
├── train/
│   ├── images/
│   └── labels/
├── val/
│   ├── images/
│   └── labels/
└── data.yaml
```
