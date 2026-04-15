import os
import json
import numpy as np
from flask import Flask, request, jsonify, render_template
from PIL import Image
import cv2
import base64
import tensorflow as tf
from io import BytesIO

try:
    from tensorflow.keras.models import load_model # type: ignore
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
    MODEL_AVAILABLE = True
except ImportError:
    MODEL_AVAILABLE = False
    print("TensorFlow not installed. Running without model.")

app = Flask(__name__)

# Configurable list of classes matching the model output
# The user can edit this list to match their model's training labels exactly.
CLASSES = [
    "Abrasions",
    "Bruises",
    "Burns",
    "Cut",
    "Diabetic Wounds",
    "Laseration",
    "Normal",
    "Pressure Wounds",
    "Surgical Wounds",
    "Venous Wounds"
]

# Define which classes are considered risky
RISKY_CLASSES = {
    "Burns",
    "Diabetic Wounds",
    "Venous Wounds",
    "Pressure Wounds"
}

MODEL_PATH = "wound_model.h5"
model = None

if MODEL_AVAILABLE and os.path.exists(MODEL_PATH):
    try:
        model = load_model(MODEL_PATH)
        print(f"Model loaded successfully from {MODEL_PATH}")
    except Exception as e:
        print(f"Error loading model: {e}")
        model = None
else:
    print(f"Model file '{MODEL_PATH}' not found or TF not installed. Using dummy predictions for UI testing.")

def preprocess_image(image):
    # Resize to 224x224
    image = image.convert('RGB')
    image = image.resize((224, 224))
    # Convert to numpy array and normalize
    img_array = np.array(image, dtype=np.float32)
    # Expand dimensions to match model input shape (1, 224, 224, 3)
    img_array = np.expand_dims(img_array, axis=0)
    if MODEL_AVAILABLE:
        img_array = preprocess_input(img_array)
    return img_array

@app.route('/')
def index():
    return render_template('index.html')

def get_last_conv_layer(base_model):
    for layer in reversed(base_model.layers):
        if len(layer.output_shape) == 4:
            return layer.name
    return None

def make_gradcam_heatmap(img_array, model, pred_index=None):
    base_model = model.layers[0]
    last_conv_layer_name = get_last_conv_layer(base_model)
    
    grad_model = tf.keras.models.Model(
        base_model.inputs,
        [base_model.get_layer(last_conv_layer_name).output, base_model.output]
    )
    
    with tf.GradientTape() as tape:
        last_conv_layer_output, _ = grad_model(img_array)
        x = base_model(img_array)
        for layer in model.layers[1:]:
            x = layer(x)
        preds = x
        
        if pred_index is None:
            pred_index = tf.argmax(preds[0])
        class_channel = preds[:, pred_index]

    grads = tape.gradient(class_channel, last_conv_layer_output)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    
    last_conv_layer_output = last_conv_layer_output[0]
    heatmap = last_conv_layer_output @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap)
    return heatmap.numpy()

def generate_heatmap_base64(original_img, heatmap):
    img = np.array(original_img)
    heatmap = cv2.resize(heatmap, (img.shape[1], img.shape[0]))
    heatmap = np.uint8(255 * heatmap)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    superimposed_img = heatmap * 0.4 + img * 0.6
    superimposed_img = np.uint8(superimposed_img)
    pil_img = Image.fromarray(superimposed_img)
    buffered = BytesIO()
    pil_img.save(buffered, format="JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")

def detect_wound_area(pil_image):
    open_cv_image = np.array(pil_image)
    if open_cv_image.shape[2] == 4:
        open_cv_image = cv2.cvtColor(open_cv_image, cv2.COLOR_RGBA2BGR)
    elif open_cv_image.shape[2] == 3:
        open_cv_image = cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2BGR)

    # 1. COIN DETECTION FOR CALIBRATION
    gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (15, 15), 0)
    
    # Use HoughCircles to find the coin
    circles = cv2.HoughCircles(
        blurred, 
        cv2.HOUGH_GRADIENT, 
        dp=1, 
        minDist=50,
        param1=50, 
        param2=30, 
        minRadius=20, 
        maxRadius=150
    )
    
    pixels_per_cm = None
    estimated_cm2 = None
    
    # Assume the coin is a standard US Quarter (24.26mm diameter -> 2.426cm)
    COIN_DIAMETER_CM = 2.426 
    
    if circles is not None:
        circles = np.uint16(np.around(circles))
        coin_c = circles[0, 0]
        radius_px = coin_c[2]
        diameter_px = radius_px * 2
        if diameter_px > 0:
            pixels_per_cm = diameter_px / COIN_DIAMETER_CM
    
    # 2. WOUND DETECTION (Existing Logic)
    hsv = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2HSV)
    lower_red1 = np.array([0, 50, 50])
    upper_red1 = np.array([10, 255, 255])
    lower_red2 = np.array([170, 50, 50])
    upper_red2 = np.array([180, 255, 255])
    
    mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
    mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
    mask = mask1 + mask2
    
    kernel = np.ones((5,5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    max_area = 0
    if contours:
        largest_contour = max(contours, key=cv2.contourArea)
        max_area = cv2.contourArea(largest_contour)
        
        # 3. Calculate CM2 if calibrated
        if pixels_per_cm is not None and pixels_per_cm > 0:
            estimated_cm2 = max_area / (pixels_per_cm ** 2)
            estimated_cm2 = round(estimated_cm2, 2)
            
    return max_area, estimated_cm2

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided.'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected.'}), 400

    try:
        image = Image.open(file.stream)
        
        predicted_class_name = "Unknown"
        category = "Unknown"
        message = ""

        if model is None:
            return jsonify({'error': 'Model not loaded. Ensure wound_model.h5 is present.'}), 500

        processed_image = preprocess_image(image)
        prediction = model.predict(processed_image)
        class_idx = np.argmax(prediction[0])
        confidence = float(np.max(prediction[0])) * 100
        
        if class_idx < len(CLASSES):
            predicted_class_name = CLASSES[class_idx]
        else:
            predicted_class_name = f"Class {class_idx}"

        if predicted_class_name in RISKY_CLASSES:
            if confidence > 70.0:
                category = "Risky"
                message = "Monitor closely or consult a doctor"
            else:
                category = "Moderate / Monitor"
                message = "Monitor closely. Confidence is too low for an extreme warning."
        else:
            category = "Healing"
            message = "Recovery appears normal"

        heatmap_base64 = ""
        try:
            heatmap = make_gradcam_heatmap(processed_image, model, class_idx)
            heatmap_base64 = generate_heatmap_base64(image, heatmap)
        except Exception as hm_err:
            print("Heatmap generation error:", hm_err)

        wound_area = 0
        wound_cm2 = None
        try:
            wound_area, wound_cm2 = detect_wound_area(image)
        except Exception as area_err:
            print("Area detection error:", area_err)

        return jsonify({
            'class': predicted_class_name,
            'category': category,
            'message': message,
            'confidence': confidence,
            'heatmapBase64': heatmap_base64,
            'estimatedArea': wound_area,
            'estimatedCm2': wound_cm2
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
