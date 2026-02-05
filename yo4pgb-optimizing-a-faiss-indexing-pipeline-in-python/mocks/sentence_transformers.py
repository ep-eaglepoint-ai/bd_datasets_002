import numpy as np

class SentenceTransformer:
    def __init__(self, model_name_or_path, **kwargs):
        self.model_name_or_path = model_name_or_path

    def encode(self, sentences, batch_size=32, show_progress_bar=None, convert_to_numpy=True, normalize_embeddings=False, **kwargs):
        # Simulate embeddings of dimension 384 (standard for all-MiniLM-L6-v2)
        dim = 384
        if isinstance(sentences, str):
            return np.random.rand(dim).astype(np.float32)
        
        count = len(sentences)
        # Generate random but stable-ish embeddings for testing
        # We don't need real embeddings, just vectors to index
        return np.random.rand(count, dim).astype(np.float32)
