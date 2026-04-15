import os
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator # type: ignore
from tensorflow.keras.applications import MobileNetV2 # type: ignore
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout # type: ignore
from tensorflow.keras.models import Model # type: ignore
from tensorflow.keras.optimizers import Adam # type: ignore
import numpy as np
from sklearn.utils.class_weight import compute_class_weight

# --- Configuration ---
DATASET_DIR = "dataset" # Path to your dataset directory
MODEL_SAVE_PATH = "wound_model_v2.h5"
BATCH_SIZE = 32
IMG_SIZE = (224, 224)
EPOCHS = 20 # Adjust as needed

print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))

# --- Data Augmentation ---
# This artificially increases the dataset size by applying random transformations.
train_datagen = ImageDataGenerator(
    rescale=1./255, # MobileNetV2 expects pixels [0, 1] usually or custom preprocess, but rescale is safe starting point. 
                    # Actually, MobileNetV2 preprocess_input expects [-1, 1], let's use the provided function.
    preprocessing_function=tf.keras.applications.mobilenet_v2.preprocess_input,
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.15,
    zoom_range=0.15,
    horizontal_flip=True,
    fill_mode='nearest',
    validation_split=0.2 # Use 20% of data for validation
)

print(f"Loading data from {DATASET_DIR}...")

if not os.path.exists(DATASET_DIR):
    print(f"Error: Dataset directory '{DATASET_DIR}' not found.")
    print("Please create it and organize your images into subfolders (e.g., dataset/Burns/, dataset/Abrasions/).")
    exit(1)

train_generator = train_datagen.flow_from_directory(
    DATASET_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training'
)

validation_generator = train_datagen.flow_from_directory(
    DATASET_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation'
)

# Number of classes based on the folders found
num_classes = train_generator.num_classes
class_names = list(train_generator.class_indices.keys())
print(f"Found {num_classes} classes: {class_names}")

# --- Address Class Imbalance (Important for Burns vs Abrasions) ---
# If some classes have more images than others, give heavier weight to minority classes
labels = train_generator.classes
class_weights_arr = compute_class_weight('balanced', classes=np.unique(labels), y=labels)
class_weights = dict(enumerate(class_weights_arr))
print("Computed class weights to handle imbalances:", class_weights)

# --- Transfer Learning Model Setup ---
print("Building model based on MobileNetV2...")
# Load MobileNetV2 without the top (classification) layer
base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=IMG_SIZE + (3,))

# Freeze the base model layers so they don't get updated initially
base_model.trainable = False

# Add custom classification layers on top
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation='relu')(x)
x = Dropout(0.5)(x) # Dropout helps prevent overfitting on small datasets
predictions = Dense(num_classes, activation='softmax')(x)

model = Model(inputs=base_model.input, outputs=predictions)

# Compile the model
model.compile(optimizer=Adam(learning_rate=0.001), 
              loss='categorical_crossentropy', 
              metrics=['accuracy'])

# --- Training Phase 1: Train only top layers ---
print("Phase 1: Training top layers...")
history = model.fit(
    train_generator,
    steps_per_epoch=train_generator.samples // BATCH_SIZE,
    validation_data=validation_generator,
    validation_steps=validation_generator.samples // BATCH_SIZE,
    epochs=EPOCHS,
    class_weight=class_weights
)

# --- (Optional) Training Phase 2: Fine-Tuning ---
# Unfreeze the top layers of the base model to fine-tune it specifically for your images
print("Phase 2: Fine-tuning base model layers...")
base_model.trainable = True
# Let's freeze all layers except the last 20 for brief fine-tuning
for layer in base_model.layers[:-20]:
    layer.trainable = False

# Recompile with a very low learning rate
model.compile(optimizer=Adam(learning_rate=0.0001), 
              loss='categorical_crossentropy', 
              metrics=['accuracy'])

history_ft = model.fit(
    train_generator,
    steps_per_epoch=train_generator.samples // BATCH_SIZE,
    validation_data=validation_generator,
    validation_steps=validation_generator.samples // BATCH_SIZE,
    epochs=5, # Short fine-tuning
    class_weight=class_weights
)

# --- Save Model ---
print(f"Saving model to {MODEL_SAVE_PATH}...")
model.save(MODEL_SAVE_PATH)
print("Training complete! You can now use this model in your Flask app.")
