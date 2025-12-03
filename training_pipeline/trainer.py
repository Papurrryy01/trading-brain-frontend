# training_pipeline/trainer.py
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from typing import Dict, Any
from model.patternfinder_xl import PatternFinderXL
from training_pipeline.sequence_dataset import MarketSequenceDataset


class PatternTrainer:
    def __init__(
        self,
        train_npz: str,
        val_npz: str,
        feature_dim: int,
        num_patterns: int = 32,
        context_dim: int = 8,
        future_steps: int = 20,
        batch_size: int = 64,
        lr: float = 1e-4,
        device: str = None
    ):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        # Datasets & loaders
        self.train_dataset = MarketSequenceDataset(train_npz, device=self.device)
        self.val_dataset = MarketSequenceDataset(val_npz, device=self.device)

        self.train_loader = DataLoader(
            self.train_dataset, batch_size=batch_size, shuffle=True, drop_last=True
        )
        self.val_loader = DataLoader(
            self.val_dataset, batch_size=batch_size, shuffle=False, drop_last=False
        )

        # Modelo
        self.model = PatternFinderXL(
            feature_dim=feature_dim,
            d_model=128,
            nhead=4,
            num_layers=4,
            num_patterns=num_patterns,
            context_dim=context_dim,
            future_steps=future_steps
        ).to(self.device)

        # Losses
        self.ce_loss = nn.CrossEntropyLoss()
        self.mse_loss = nn.MSELoss()
        self.bce_loss = nn.BCELoss()

        # Optimizer
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)

    def compute_loss(self, batch: Dict[str, Any]) -> Dict[str, torch.Tensor]:
        inputs = batch["inputs"].to(self.device)                  # [B, seq, feat]
        pattern_ids = batch["pattern_id"].to(self.device)         # [B]
        future_paths = batch["future_paths"].to(self.device)      # [B, 3, steps]
        conf_target = batch["confidence_target"].to(self.device)  # [B]

        outputs = self.model(inputs)

        # pattern classification
        loss_pattern = self.ce_loss(outputs["pattern_logits"], pattern_ids)

        # projection loss (MSE)
        loss_proj = self.mse_loss(outputs["projection"], future_paths)

        # confidence loss
        loss_conf = self.bce_loss(outputs["confidence"], conf_target)

        loss_context = torch.tensor(0.0, device=self.device)
        if "context_targets" in batch:
            ctx_tgt = batch["context_targets"].to(self.device)
            loss_context = self.mse_loss(outputs["context"], ctx_tgt)

        # pesos (puedes tunear estos lambdas)
        lambda_pattern = 1.0
        lambda_proj = 1.0
        lambda_conf = 0.5
        lambda_ctx = 0.2

        total_loss = (
            lambda_pattern * loss_pattern
            + lambda_proj * loss_proj
            + lambda_conf * loss_conf
            + lambda_ctx * loss_context
        )

        return {
            "total": total_loss,
            "pattern": loss_pattern,
            "projection": loss_proj,
            "confidence": loss_conf,
            "context": loss_context
        }

    def train_epoch(self, epoch: int) -> Dict[str, float]:
        self.model.train()
        running_losses = {"total": 0.0, "pattern": 0.0, "projection": 0.0,
                          "confidence": 0.0, "context": 0.0}
        num_batches = 0

        for batch in self.train_loader:
            self.optimizer.zero_grad()
            losses = self.compute_loss(batch)
            losses["total"].backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()

            for k in running_losses.keys():
                running_losses[k] += losses[k].item()
            num_batches += 1

        avg_losses = {k: v / num_batches for k, v in running_losses.items()}
        print(f"[Epoch {epoch}] Train:", avg_losses)
        return avg_losses

    def validate_epoch(self, epoch: int) -> Dict[str, float]:
        self.model.eval()
        running_losses = {"total": 0.0, "pattern": 0.0, "projection": 0.0,
                          "confidence": 0.0, "context": 0.0}
        num_batches = 0

        correct_patterns = 0
        total_samples = 0

        with torch.no_grad():
            for batch in self.val_loader:
                losses = self.compute_loss(batch)

                # pattern accuracy
                inputs = batch["inputs"].to(self.device)
                pattern_ids = batch["pattern_id"].to(self.device)
                outputs = self.model(inputs)
                preds = torch.argmax(outputs["pattern_logits"], dim=-1)
                correct_patterns += (preds == pattern_ids).sum().item()
                total_samples += pattern_ids.size(0)

                for k in running_losses.keys():
                    running_losses[k] += losses[k].item()
                num_batches += 1

        avg_losses = {k: v / num_batches for k, v in running_losses.items()}
        acc = correct_patterns / total_samples if total_samples > 0 else 0.0
        avg_losses["pattern_acc"] = acc
        print(f"[Epoch {epoch}] Val:", avg_losses)
        return avg_losses

    def save_checkpoint(self, path: str, epoch: int, extra: Dict[str, Any] = None):
        checkpoint = {
            "epoch": epoch,
            "model_state": self.model.state_dict(),
            "optimizer_state": self.optimizer.state_dict(),
        }
        if extra:
            checkpoint.update(extra)
        torch.save(checkpoint, path)
        print(f"Checkpoint saved to {path}")
