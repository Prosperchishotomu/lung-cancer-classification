from django.db import models
from django.contrib.auth.models import User
import uuid


class Patient(models.Model):
    """Patient registry entry with a system-generated standard identifier."""

    SEX_CHOICES = [
        ("", "Not specified"),
        ("female", "Female"),
        ("male", "Male"),
        ("other", "Other"),
    ]

    patient_id = models.CharField(max_length=20, unique=True, editable=False)
    full_name = models.CharField(max_length=200)
    date_of_birth = models.DateField(blank=True, null=True)
    sex = models.CharField(max_length=20, choices=SEX_CHOICES, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, null=True)
    national_id = models.CharField(max_length=80, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name="created_patients")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["patient_id"]),
            models.Index(fields=["full_name"]),
            models.Index(fields=["national_id"]),
        ]

    def __str__(self):
        return f"{self.patient_id} - {self.full_name}"

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "patient_name": self.full_name,
            "full_name": self.full_name,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "sex": self.sex,
            "phone": self.phone,
            "national_id": self.national_id,
            "address": self.address,
            "notes": self.notes,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class PatientEpisode(models.Model):
    """A visit/episode of care for a returning or newly registered patient."""

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="episodes")
    episode_number = models.PositiveIntegerField()
    reason = models.CharField(max_length=255, blank=True, default="CT analysis")
    status = models.CharField(max_length=30, default="open")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name="created_episodes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("patient", "episode_number")
        indexes = [
            models.Index(fields=["patient", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.patient.patient_id} Episode {self.episode_number}"

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient.patient_id,
            "episode_number": self.episode_number,
            "reason": self.reason,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }


class PredictionRecord(models.Model):
    """Store prediction history for audit trail and analytics"""
    
    PREDICTION_CHOICES = [
        ("Adenocarcinoma", "Adenocarcinoma"),
        ("Large Cell Carcinoma", "Large Cell Carcinoma"),
        ("Normal / Benign", "Normal / Benign"),
        ("Squamous Cell Carcinoma", "Squamous Cell Carcinoma"),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="predictions")
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, blank=True, null=True, related_name="predictions")
    episode = models.ForeignKey(PatientEpisode, on_delete=models.SET_NULL, blank=True, null=True, related_name="predictions")
    
    # Patient info (for clinical use)
    legacy_patient_id = models.CharField(max_length=50, blank=True, null=True)
    patient_name = models.CharField(max_length=200, blank=True, null=True)
    
    # Image metadata
    image_filename = models.CharField(max_length=255)
    image_size = models.IntegerField()  # File size in bytes
    
    # Prediction results
    predicted_class = models.CharField(max_length=50, choices=PREDICTION_CHOICES)
    confidence_score = models.FloatField()  # 0-100%
    
    # All class probabilities
    adenocarcinoma_prob = models.FloatField()
    large_cell_prob = models.FloatField()
    normal_prob = models.FloatField()
    squamous_cell_prob = models.FloatField()
    
    # Flag if uncertain
    is_uncertain = models.BooleanField(default=False)
    uncertainty_reason = models.TextField(blank=True, null=True)
    
    # Clinical metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Visualization data (stored as base64 for portability in this project)
    image_base64 = models.TextField(blank=True, null=True)
    heatmap_base64 = models.TextField(blank=True, null=True)
    
    # Optional: radiologist notes
    clinical_notes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["legacy_patient_id"]),
        ]
    
    def __str__(self):
        return f"Prediction {self.id} - {self.predicted_class} ({self.confidence_score}%)"
    
    def to_dict(self):
        """Serialize to dictionary for API responses"""
        # Convert raw probabilities to percentages and match the format of ModelInference.format_predictions
        probs = [
            {"class": "Adenocarcinoma", "probability": round(self.adenocarcinoma_prob * 100, 2)},
            {"class": "Large Cell Carcinoma", "probability": round(self.large_cell_prob * 100, 2)},
            {"class": "Normal / Benign", "probability": round(self.normal_prob * 100, 2)},
            {"class": "Squamous Cell Carcinoma", "probability": round(self.squamous_cell_prob * 100, 2)},
        ]
        # Sort by probability descending for a better UI presentation
        probs.sort(key=lambda x: x["probability"], reverse=True)

        return {
            "id": str(self.id),
            "patient_id": self.patient.patient_id if self.patient else self.legacy_patient_id,
            "patient_name": self.patient.full_name if self.patient else self.patient_name,
            "episode_id": self.episode_id,
            "episode_number": self.episode.episode_number if self.episode else None,
            "predicted_class": self.predicted_class,
            "confidence_score": self.confidence_score,
            "probabilities": probs,
            "image": self.image_base64,
            "heatmap": self.heatmap_base64,
            "is_uncertain": self.is_uncertain,
            "uncertainty_reason": self.uncertainty_reason,
            "created_at": self.created_at.isoformat(),
            "clinical_notes": self.clinical_notes,
        }


class ModelMetrics(models.Model):
    """Store aggregated model performance metrics"""
    
    metric_name = models.CharField(max_length=100, unique=True)
    value = models.FloatField()
    updated_at = models.DateTimeField(auto_now=True)
    metadata = models.JSONField(default=dict, blank=True)  # For detailed breakdowns
    
    def __str__(self):
        return f"{self.metric_name}: {self.value}"


class UserProfile(models.Model):
    """Extend User model with clinical metadata"""
    
    ROLE_CHOICES = [
        ("radiologist", "Radiologist"),
        ("clinician", "Clinician"),
        ("admin", "Administrator"),
        ("researcher", "Researcher"),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="clinician")
    institution = models.CharField(max_length=255, blank=True, null=True)
    license_number = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.role}"
