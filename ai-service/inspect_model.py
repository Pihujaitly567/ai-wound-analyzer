import tensorflow as tf

try:
    model = tf.keras.models.load_model('wound_model.h5')
    print("\n--- MODEL LAYERS ---")
    for layer in model.layers:
        print(f"{layer.name} ({layer.__class__.__name__})")
except Exception as e:
    print(e)
