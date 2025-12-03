# training_pipeline/sequence_dataset.py
import numpy as np
import torch
from torch.utils.data import Dataset


class MarketSequenceDataset(Dataset):
    """
    Dataset de secuencias de mercado para entrenar PatternFinderXL.
    Espera un archivo .npz con al menos:
      - inputs: [N, seq_len, feature_dim]
      - pattern_ids: [N]
      - future_paths: [N, 3, future_steps]
    Opcionales:
      - confidence: [N]
      - context_targets: [N, context_dim]
    """

    def __init__(self, npz_path: str, device: str = "cpu"):
        super().__init__()
        data = np.load(npz_path)

        self.inputs = data["inputs"].astype(np.float32)                  # [N, seq, feat]
        self.pattern_ids = data["pattern_ids"].astype(np.int64)         # [N]
        self.future_paths = data["future_paths"].astype(np.float32)     # [N, 3, steps]

        self.confidence = data["confidence"].astype(np.float32) if "confidence" in data.files \
            else np.ones(len(self.inputs), dtype=np.float32)

        if "context_targets" in data.files:
            self.context_targets = data["context_targets"].astype(np.float32)
        else:
            self.context_targets = None

        self.device = device

    def __len__(self):
        return self.inputs.shape[0]

    def __getitem__(self, idx):
        x = torch.from_numpy(self.inputs[idx])           # [seq, feat]
        y_pattern = torch.tensor(self.pattern_ids[idx])  # []
        y_future = torch.from_numpy(self.future_paths[idx])  # [3, steps]
        y_conf = torch.tensor(self.confidence[idx])      # []

        sample = {
            "inputs": x,
            "pattern_id": y_pattern,
            "future_paths": y_future,
            "confidence_target": y_conf
        }

        if self.context_targets is not None:
            sample["context_targets"] = torch.from_numpy(
                self.context_targets[idx]
            )

        return sample
