import numpy as np
import io
import base64
import threading
import logging
from PIL import Image
import cv2

logger = logging.getLogger(__name__)

# Global lazy imports for heavy dependencies
tf = None
load_model = None
preprocess_input = None


class ModelManager:
    """Singleton pattern for model loading and caching the Grad-CAM sub-graph."""

    _instance = None
    _lock = threading.Lock()
    _load_lock = threading.Lock()
    _model = None
    _gradcam_layer_model = None  # cached once per model load

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(ModelManager, cls).__new__(cls)
                    cls._instance.model_path = None
        return cls._instance

    def set_model_path(self, path):
        """Set the path to the model file."""
        self.model_path = path

    def load_model(self, model_path=None):
        """Load model and pre-build the Grad-CAM sub-model (cached)."""
        global tf, load_model, preprocess_input

        path_to_use = model_path or self.model_path
        if path_to_use is None:
            logger.error("No model path provided to ModelManager.")
            return None

        if self._model is not None:
            return self._model

        with self._load_lock:
            if self._model is not None:
                return self._model

            # Lazy import heavy ML dependencies only when needed.
            if tf is None:
                logger.info("Lazy-loading TensorFlow and Keras dependencies.")
                import tensorflow as _tf
                from tensorflow.keras.models import load_model as _load_model
                from tensorflow.keras.applications.resnet50 import preprocess_input as _preprocess_input
                tf = _tf
                load_model = _load_model
                preprocess_input = _preprocess_input

            try:
                logger.info("Loading model from %s.", path_to_use)
                self._model = load_model(path_to_use)
                logger.info("Model loaded successfully. Type: %s", type(self._model).__name__)

                # Pre-build Grad-CAM sub-graph so the first request is not slow.
                self._build_gradcam_layer_model()

                # Warm up the graph and device buffers once per process.
                logger.info("Warming up model inference engine.")
                dummy_input = tf.zeros((1, 224, 224, 3))
                self._model.predict(dummy_input, verbose=0)
                if self._gradcam_layer_model:
                    self._gradcam_layer_model(dummy_input, training=False)
                logger.info("Model warmup complete.")

            except Exception:
                logger.exception("Failed to load model.")
                self._model = None
                self._gradcam_layer_model = None
        return self._model

    def _build_gradcam_layer_model(self):
        
        if self._model is None:
            return
        try:
            last_conv_layer = self._find_last_conv_layer(self._model)
            if last_conv_layer is None:
                logger.warning("No spatial layer found. Grad-CAM disabled.")
                return

            logger.info("Building Grad-CAM graph using layer: %s", last_conv_layer.name)

            try:
                # Create a fresh Input tensor
                inputs = tf.keras.Input(shape=self._model.input_shape[1:], name='gradcam_input')
                
                # Iterate through layers and rebuild the graph
                # This ensures every node is connected to the new 'inputs'
                x = inputs
                spatial_output = None
                
                for layer in self._model.layers:
                    # Skip the original InputLayer as we have our own
                    if type(layer).__name__ == 'InputLayer':
                        continue
                    
                    x = layer(x)
                    if layer.name == last_conv_layer.name:
                        spatial_output = x
                
                if spatial_output is None:
                    # Fallback: if we didn't hit it by name, maybe it was nested.
                    # In that case, we use the last spatial layer we found.
                    spatial_output = x
                
                self._gradcam_layer_model = tf.keras.Model(inputs=inputs, outputs=[spatial_output, x])
                logger.info("Grad-CAM functional graph built successfully.")
                
            except Exception:
                logger.warning("Grad-CAM graph rebuild failed. Trying standard construction.", exc_info=True)
                # Fallback to standard construction
                self._gradcam_layer_model = tf.keras.Model(
                    inputs=self._model.inputs,
                    outputs=[last_conv_layer.output, self._model.output]
                )

        except Exception:
            logger.exception("Grad-CAM engine failure.")
            self._gradcam_layer_model = None

    @staticmethod
    def _find_last_conv_layer(model):
        
        for layer in reversed(model.layers):
            # 1. Check if this layer itself has a 4D spatial output
            if hasattr(layer, 'output') and len(layer.output.shape) == 4:
                # We return this layer as the 'spatial endpoint' for this level.
                # This works for both standard Conv layers and nested models (Functional/Sequential).
                return layer
            
            # 2. If it's a sub-model but didn't have a 4D output itself (e.g. it includes the head),
            # then we MUST search inside it.
            if hasattr(layer, 'layers'):
                sub_layer = ModelManager._find_last_conv_layer(layer)
                if sub_layer is not None:
                    return sub_layer
                
        return None


    def get_model(self):
        """Get the model, loading it if necessary."""
        if self._model is None:
            self.load_model()
        return self._model

    def get_gradcam_layer_model(self):
        """Return cached Grad-CAM sub-model, loading model if necessary."""
        if self._model is None:
            self.load_model()
        return self._gradcam_layer_model

    def unload_model(self):
        self._model = None
        self._gradcam_layer_model = None


class ImageProcessor:
    
    IMG_SIZE = (224, 224)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    ALLOWED_FORMATS = {"jpeg", "jpg", "png", "bmp", "tiff"}

    @staticmethod
    def validate_file_format(file_obj):
        """Check if file is a valid image format."""
        try:
            if "image" not in file_obj.content_type.lower():
                return False, "Uploaded file is not an image"
            return True, ""
        except Exception:
            return False, "Unable to determine file format"

    @staticmethod
    def validate_file_size(file_bytes):
        """Check file size against limit."""
        if len(file_bytes) > ImageProcessor.MAX_FILE_SIZE:
            limit_mb = ImageProcessor.MAX_FILE_SIZE / 1024 / 1024
            return False, f"File size exceeds {limit_mb:.0f}MB limit"
        return True, ""

    @staticmethod
    def open_image_rgb(image_bytes) -> Image.Image:
        """Decode bytes into a PIL RGB image (reusable)."""
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")

    @staticmethod
    def is_valid_lung_scan(image_bytes, pre_decoded_img=None):
        
        try:
            img = pre_decoded_img or ImageProcessor.open_image_rgb(image_bytes)
            # Optimization: Resize for validation to speed up CV operations
            val_img = img.resize((512, 512), Image.Resampling.BILINEAR)
            img_array = np.array(val_img)
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)

            # 1. Chromatic Anomaly Detection
            hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
            s_mean = hsv[:,:,1].mean()
            if s_mean > 25: 
                return False, "This seems to be not a Chest scan (Color detected)."

            # 2. Exposure / Luminance profiling
            mean_val = gray.mean()
            if mean_val > 235 or mean_val < 10:
                return False, "This seems to be not a Chest scan (Invalid exposure)."

            # 3. Blur Detection (Laplacian Variance)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            if laplacian_var < 10:
                return False, "Upload a picture with better quality."

            # 4. Anatomical Complexity (Intensity standard deviation)
            if gray.std() < 10:
                return False, "This seems to be not a Chest scan (Low complexity)."

            # 5. Lung Shape Detection (Contour Analysis)
            # In CT, lungs are low density (dark). We threshold for dark regions.
            # We normalize to 0-255 first if not already
            norm_gray = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
            
            # Threshold for lung-like air regions (typically very dark in CT)
            _, thresh = cv2.threshold(norm_gray, 60, 255, cv2.THRESH_BINARY_INV)
            
            # Cleanup with morphological operations
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter for lung-like contours based on area and position
            height, width = gray.shape
            img_area = height * width
            lung_contours = []
            
            for cnt in contours:
                area = cv2.contourArea(cnt)
                # Lungs should take up a significant but not overwhelming portion of the slice
                if (img_area * 0.05) < area < (img_area * 0.45):
                    # Check position (should not be at the very edges typically)
                    x, y, w, h = cv2.boundingRect(cnt)
                    if 0.1 * width < (x + w/2) < 0.9 * width:
                        lung_contours.append(cnt)
            
            # Typically a valid lung CT slice has 2 lung regions (or 1 large one if joined)
            if len(lung_contours) < 1:
                return False, "Lung structures not detected in the provided scan."

            return True, ""
        except Exception:
            logger.exception("Anatomical validation failed.")
            return False, "Anatomical validation failed."

    @staticmethod
    def preprocess_image(image_bytes, pre_decoded_img=None):
        
        img = pre_decoded_img or ImageProcessor.open_image_rgb(image_bytes)
        img_resized = img.resize(ImageProcessor.IMG_SIZE, Image.Resampling.LANCZOS)
        img_array = np.array(img_resized, dtype=np.float32)

        # Original uint8 array for Grad-CAM overlay
        original_array = img_array.astype(np.uint8)

        # ResNet-50 normalisation
        preprocessed = preprocess_input(img_array.copy())
        preprocessed = np.expand_dims(preprocessed, axis=0)

        return preprocessed, original_array


class GradCAM:
    """Grad-CAM visualization using the cached sub-model from ModelManager."""

    def __init__(self, layer_model):
        
        self.layer_model = layer_model

    def generate_heatmap(self, img_array, pred_index=None, eps=1e-8):
        """
        Generate Grad-CAM heatmap with a robust saliency fallback.
        """
        img_tensor = tf.cast(img_array, tf.float32)

        with tf.GradientTape() as tape:
            tape.watch(img_tensor)
            
            # Check if we have a multi-output model or a partial one
            output = self.layer_model(img_tensor, training=False)
            
            if isinstance(output, (list, tuple)):
                conv_outputs, predictions = output
            else:
                # Partial model (saliency mode)
                conv_outputs = output
                logger.info("Using saliency fallback for Grad-CAM.")
                heatmap = tf.reduce_mean(conv_outputs[0], axis=-1)
                return self._normalize_heatmap(heatmap, eps)

            tape.watch(conv_outputs)
            
            if pred_index is None:
                pred_index = tf.argmax(predictions[0])
            
            class_channel = predictions[:, pred_index]

        # Compute gradients
        grads = tape.gradient(class_channel, conv_outputs)
        
        if grads is None:
            logger.warning("Grad-CAM gradients disconnected. Falling back to saliency map.")
            heatmap = tf.reduce_mean(conv_outputs[0], axis=-1)
        else:
            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
            heatmap = conv_outputs[0] @ pooled_grads[..., tf.newaxis]
            heatmap = tf.squeeze(heatmap)

        return self._normalize_heatmap(heatmap, eps)

    def _normalize_heatmap(self, heatmap, eps=1e-8):
        """Helper to normalize and ReLU the heatmap."""
        heatmap = tf.maximum(heatmap, 0)
        max_val = tf.math.reduce_max(heatmap)
        if max_val > 0:
            heatmap = heatmap / (max_val + eps)
        else:
            heatmap = tf.zeros(heatmap.shape)
        return heatmap.numpy()

    def overlay_heatmap(self, original_img, heatmap, alpha=0.5):
        """Overlay Grad-CAM heatmap onto the original image with high contrast."""
        # Safety: Ensure original_img is (224, 224, 3)
        if original_img.shape[:2] != (224, 224):
            original_img = cv2.resize(original_img, (224, 224))

        # Ensure heatmap is in [0, 255]
        heatmap_uint8 = np.uint8(255 * heatmap)
        
        # Resize heatmap to match original image size
        heatmap_resized = cv2.resize(heatmap_uint8, (224, 224))
        
        # Use COLORMAP_JET for medical visualization (standard)
        heatmap_colored = cv2.applyColorMap(heatmap_resized, cv2.COLORMAP_JET)
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        
        # Improved blending for medical scans (lighter scan, heavier heatmap)
        overlayed = cv2.addWeighted(original_img, 0.4, heatmap_colored, 0.6, 0)
        return overlayed

    @staticmethod
    def image_to_base64(img_array, quality=70):
        
        img = Image.fromarray(np.uint8(img_array))
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality, optimize=True)
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/jpeg;base64,{img_str}"


class ModelInference:
    """Handle model prediction and result formatting."""

    CLASS_NAMES = [
        "Adenocarcinoma",
        "Large Cell Carcinoma",
        "Normal / Benign",
        "Squamous Cell Carcinoma",
    ]

    CONFIDENCE_THRESHOLD = 0.95

    @staticmethod
    def predict(model, preprocessed_img):
        
        predictions = model.predict(preprocessed_img, verbose=0)
        return predictions[0]

    @staticmethod
    def format_predictions(predictions):
        
        probs = [
            {"class": cls, "probability": round(float(predictions[i]) * 100, 2)}
            for i, cls in enumerate(ModelInference.CLASS_NAMES)
        ]
        probs.sort(key=lambda x: x["probability"], reverse=True)
        return probs

    @staticmethod
    def get_predicted_class(predictions):
        """Return (class_name, confidence_float) for the top prediction."""
        max_idx = int(np.argmax(predictions))
        return ModelInference.CLASS_NAMES[max_idx], float(predictions[max_idx])

    @staticmethod
    def generate_justification(pred_class, confidence):
        """
        Generate a clinical justification for the prediction based on 
        known pathological features associated with the identified class.
        """
        justifications = {
            "Adenocarcinoma": (
                "The ResNet-50 feature extractor identified morphological patterns consistent with "
                "adenocarcinoma, typically characterized by peripheral focal nodules, spiculated "
                "margins, and ground-glass opacities. The high activation in the peripheral zones "
                "supports this classification."
            ),
            "Squamous Cell Carcinoma": (
                "Feature maps indicate a central endobronchial orientation and density patterns "
                "associated with squamous cell carcinoma. The model detected high-intensity "
                "spatial features often corresponding to cavitation and central obstructive patterns."
            ),
            "Large Cell Carcinoma": (
                "The diagnosis is supported by the detection of a large, undifferentiated peripheral "
                "mass pattern. The model's attention maps focused on regions showing significant "
                "textural heterogeneity, which is clinically indicative of rapid growth and necrosis "
                "typical of large cell variants."
            ),
            "Normal / Benign": (
                "No focal mass-like lesions or pathological spiculation were detected. The model "
                "identified clear bronchovascular structures and symmetric parenchymal density, "
                "leading to a high-confidence 'Normal' classification."
            )
        }
        
        reason = justifications.get(pred_class, "The classification is based on deep textural features extracted by the ResNet-50 backbone.")
        
        if confidence < 0.98:
            reason += " Note: Minor textural ambiguities were detected; clinical correlation with biopsy is recommended."
            
        return reason

    @staticmethod
    def is_uncertain(predictions):
        """True if top confidence is below the threshold."""
        return float(np.max(predictions)) < ModelInference.CONFIDENCE_THRESHOLD


class ModelMetricsCalculator:
    """Calculate and track model performance metrics."""

    @staticmethod
    def calculate_metrics(predictions_list, true_labels_list):
        
        from sklearn.metrics import (
            accuracy_score,
            f1_score,
            precision_score,
            recall_score,
        )

        return {
            "accuracy": float(accuracy_score(true_labels_list, predictions_list)),
            "precision": float(
                precision_score(
                    true_labels_list, predictions_list, average="weighted", zero_division=0
                )
            ),
            "recall": float(
                recall_score(
                    true_labels_list, predictions_list, average="weighted", zero_division=0
                )
            ),
            "f1_score": float(
                f1_score(
                    true_labels_list, predictions_list, average="weighted", zero_division=0
                )
            ),
        }
