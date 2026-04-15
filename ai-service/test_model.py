import numpy as np
import tensorflow as tf
from PIL import Image

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

def predict_single(image_path, use_preprocess=True):
    model = tf.keras.models.load_model('wound_model.h5')
    image = Image.open(image_path).convert('RGB').resize((224, 224))
    
    # Try with mobilenet preprocess
    img_array = np.array(image, dtype=np.float32)
    img_array = np.expand_dims(img_array, axis=0)
    if use_preprocess:
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
        img_array = preprocess_input(img_array)
    else:
        img_array = img_array / 255.0

    prediction = model.predict(img_array)[0]
    
    print("\n--- Predictions ---")
    for i, p in enumerate(prediction):
        print(f"{CLASSES[i]}: {p*100:.2f}%")
    
    print(f"\nTop Prediction: {CLASSES[np.argmax(prediction)]}")
    
print("With MobileNet Preprocess:")
predict_single('../test.jpg', True)

print("\n\nWith Simple /255 Preprocess:")
predict_single('../test.jpg', False)
