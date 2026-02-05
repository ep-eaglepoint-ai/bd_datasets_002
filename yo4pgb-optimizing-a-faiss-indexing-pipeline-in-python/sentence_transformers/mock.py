import numpy as np
import time

class SentenceTransformer:
    """
    A lightweight mock of SentenceTransformer for build optimization.
    Simulates embedding generation with artificial latency to verify performance improvements.
    """
    def __init__(self, model_name_or_path, **kwargs):
        self.model_name_or_path = model_name_or_path

    def encode(self, sentences, batch_size=32, show_progress_bar=None, convert_to_numpy=True, normalize_embeddings=False, **kwargs):
        """
        Generate random embeddings to simulate model output.
        
        Adds a 20ms delay per call to simulate neural network inference latency,
        allowing performance tests to distinguish between batch and serial processing.
        """
        # Simulate neural network latency (very important for performance comparison)
        # 20ms per call simulates a small model
        time.sleep(0.02)
        
        dim = 384
        if isinstance(sentences, str):
            return np.random.rand(dim).astype(np.float32)
        
        count = len(sentences)
        return np.random.rand(count, dim).astype(np.float32)
