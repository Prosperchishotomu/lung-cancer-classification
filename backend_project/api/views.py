import os
import numpy as np
import re
import logging
from dataclasses import dataclass
from datetime import timedelta
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Q, Count, Avg, Max
from django.db import IntegrityError, transaction
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate

from .models import PredictionRecord, UserProfile, Patient, PatientEpisode
from .ml_utils import (
    ModelManager, ImageProcessor, GradCAM,
    ModelInference,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_PATH = os.path.join(BASE_DIR, "final_lung_cancer_model.keras")
logger = logging.getLogger(__name__)

# Initialize model manager (singleton) — Grad-CAM sub-model is pre-built here
model_manager = ModelManager()
model_manager.set_model_path(MODEL_PATH)


SELF_SERVICE_ROLES = {'clinician', 'radiologist', 'researcher'}
USERNAME_RE = re.compile(r'^[A-Za-z0-9_.-]{3,150}$')
PATIENT_ID_PREFIX = 'LC'
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100


@dataclass
class PreparedPrediction:
    file: object
    image_bytes: bytes
    decoded_img: object
    patient: Patient
    episode: PatientEpisode


#  AUTH ENDPOINTS 


def _bad_request(message):
    return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)


def _generate_patient_id():
    year = timezone.now().year
    prefix = f'{PATIENT_ID_PREFIX}-{year}-'
    latest = (
        Patient.objects
        .filter(patient_id__startswith=prefix)
        .order_by('-patient_id')
        .first()
    )
    next_number = 1
    if latest:
        try:
            next_number = int(latest.patient_id.rsplit('-', 1)[1]) + 1
        except (IndexError, ValueError):
            next_number = Patient.objects.filter(patient_id__startswith=prefix).count() + 1
    return f'{prefix}{next_number:06d}'


def _parse_optional_date(value):
    if not value:
        return None
    try:
        from datetime import date
        return date.fromisoformat(str(value))
    except ValueError:
        raise ValidationError('Date of birth must use YYYY-MM-DD format')


def _create_patient_from_request(request):
    full_name = request.data.get('patient_name') or request.data.get('full_name')
    full_name = (full_name or '').strip()
    if not full_name:
        raise ValidationError('Patient name is required')

    for _ in range(3):
        try:
            with transaction.atomic():
                patient = Patient.objects.create(
                    patient_id=_generate_patient_id(),
                    full_name=full_name,
                    date_of_birth=_parse_optional_date(request.data.get('date_of_birth')),
                    sex=(request.data.get('sex') or '').strip().lower(),
                    phone=(request.data.get('phone') or '').strip() or None,
                    national_id=(request.data.get('national_id') or '').strip() or None,
                    address=(request.data.get('address') or '').strip() or None,
                    notes=(request.data.get('notes') or '').strip() or None,
                    created_by=request.user if request.user.is_authenticated else None,
                )
            return patient
        except IntegrityError:
            continue
    raise ValidationError('Unable to generate a patient ID. Please try again.')


def _get_or_create_patient_for_prediction(request):
    patient_id = (request.data.get('patient_id') or '').strip()
    patient_name = (request.data.get('patient_name') or request.data.get('full_name') or '').strip()

    if patient_id:
        try:
            patient = Patient.objects.get(patient_id__iexact=patient_id)
        except Patient.DoesNotExist:
            raise ValidationError('Patient ID was not found. Register the patient first.')
        if patient_name and patient.full_name.lower() != patient_name.lower():
            raise ValidationError('Patient name does not match the selected patient ID.')
        return patient

    return _create_patient_from_request(request)


def _create_episode(patient, user, reason='CT analysis'):
    with transaction.atomic():
        last_episode = (
            PatientEpisode.objects
            .select_for_update()
            .filter(patient=patient)
            .order_by('-episode_number')
            .first()
        )
        next_number = (last_episode.episode_number if last_episode else 0) + 1
        return PatientEpisode.objects.create(
            patient=patient,
            episode_number=next_number,
            reason=reason or 'CT analysis',
            created_by=user if user.is_authenticated else None,
        )


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def register_user(request):
    """Register a new user"""
    try:
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')
        role = request.data.get('role', 'clinician')

        if not username or not email or not password:
            return _bad_request('Username, email, and password are required')

        if not USERNAME_RE.match(username):
            return _bad_request('Username must be 3-150 characters and use only letters, numbers, dots, hyphens, or underscores')

        if not confirm_password:
            return _bad_request('Password confirmation is required')

        if password != confirm_password:
            return _bad_request('Passwords do not match')

        if role not in SELF_SERVICE_ROLES:
            return _bad_request('System administrators cannot be created through registration')

        try:
            validate_password(password)
        except ValidationError as exc:
            return _bad_request(' '.join(exc.messages))

        if User.objects.filter(username__iexact=username).exists():
            return _bad_request('Username already exists')

        if User.objects.filter(email__iexact=email).exists():
            return _bad_request('Email already registered')

        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )

            UserProfile.objects.create(user=user, role=role)
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'email': user.email,
            'role': role,
            'is_staff': user.is_staff
        }, status=status.HTTP_201_CREATED)

    except IntegrityError:
        return _bad_request('Username or email already exists')
    except Exception as e:
        return Response(
            {'error': f'Registration failed: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login_user(request):
    """Login and get auth token"""
    login_identifier = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not login_identifier or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    lookup = {'email__iexact': login_identifier} if '@' in login_identifier else {'username__iexact': login_identifier}
    matched_user = User.objects.filter(**lookup).first()
    username = matched_user.username if matched_user else login_identifier

    user = authenticate(request, username=username, password=password)

    if not user:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    token, _ = Token.objects.get_or_create(user=user)
    # Use get_or_create so users without a profile (e.g. createsuperuser) never crash
    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={'role': 'admin' if user.is_staff else 'clinician'}
    )

    return Response({
        'token': token.key,
        'user_id': user.pk,
        'username': user.username,
        'email': user.email,
        'role': profile.role,
        'is_staff': user.is_staff
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """Logout by deleting token"""
    try:
        request.auth.delete()
        return Response({'message': 'Logged out successfully'})
    except Exception:
        return Response({'message': 'Logout failed'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user profile"""
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={'role': 'admin' if user.is_staff else 'clinician'}
    )

    return Response({
        'user_id': user.pk,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': profile.role,
        'institution': profile.institution,
        'license_number': profile.license_number,
        'joined_at': user.date_joined.isoformat(),
    })


# ==================== PREDICTION ENDPOINTS ====================

def _validate_image(file, image_bytes, pre_decoded_img=None):
    """
    Shared validation helper — avoids duplicating validation logic.
    Returns (is_ok, error_response_or_None).
    """
    valid_format, fmt_err = ImageProcessor.validate_file_format(file)
    if not valid_format:
        return False, Response(
            {'error': fmt_err, 'success': False},
            status=status.HTTP_400_BAD_REQUEST
        )

    valid_size, size_err = ImageProcessor.validate_file_size(image_bytes)
    if not valid_size:
        return False, Response(
            {'error': size_err, 'success': False},
            status=status.HTTP_400_BAD_REQUEST
        )

    is_valid, err_msg = ImageProcessor.is_valid_lung_scan(image_bytes, pre_decoded_img=pre_decoded_img)
    if not is_valid:
        return False, Response(
            {'success': False, 'error': err_msg},
            status=status.HTTP_400_BAD_REQUEST
        )

    return True, None


def _prepare_prediction_request(request):
    if 'image' not in request.FILES:
        raise ValidationError('No image file provided')

    file = request.FILES['image']
    image_bytes = file.read()
    decoded_img = ImageProcessor.open_image_rgb(image_bytes)
    ok, err_response = _validate_image(file, image_bytes, pre_decoded_img=decoded_img)
    if not ok:
        return None, err_response

    patient = _get_or_create_patient_for_prediction(request)
    episode = _create_episode(
        patient,
        request.user,
        request.data.get('episode_reason') or 'CT analysis'
    )

    return PreparedPrediction(
        file=file,
        image_bytes=image_bytes,
        decoded_img=decoded_img,
        patient=patient,
        episode=episode,
    ), None


def _run_model_prediction(prepared):
    model = model_manager.get_model()
    if model is None:
        raise RuntimeError('Model not loaded on server')

    preprocessed, original_img = ImageProcessor.preprocess_image(
        prepared.image_bytes,
        pre_decoded_img=prepared.decoded_img,
    )
    predictions = ModelInference.predict(model, preprocessed)
    pred_class, confidence = ModelInference.get_predicted_class(predictions)

    return {
        'preprocessed': preprocessed,
        'original_img': original_img,
        'predictions': predictions,
        'pred_class': pred_class,
        'confidence': confidence,
        'is_uncertain': ModelInference.is_uncertain(predictions),
    }


def _generate_prediction_heatmap(inference):
    gradcam_layer_model = model_manager.get_gradcam_layer_model()
    if gradcam_layer_model is None:
        return None

    try:
        grad_cam = GradCAM(gradcam_layer_model)
        pred_idx = int(np.argmax(inference['predictions']))
        heatmap = grad_cam.generate_heatmap(inference['preprocessed'], pred_index=pred_idx)
        overlayed = grad_cam.overlay_heatmap(inference['original_img'], heatmap)
        return GradCAM.image_to_base64(overlayed)
    except Exception:
        logger.exception("Heatmap generation failed.")
        return None


def _create_prediction_record(request, prepared, inference, heatmap_base64=None):
    predictions = inference['predictions']
    confidence = inference['confidence']

    return PredictionRecord.objects.create(
        user=request.user,
        patient=prepared.patient,
        episode=prepared.episode,
        legacy_patient_id=prepared.patient.patient_id,
        patient_name=prepared.patient.full_name,
        image_filename=prepared.file.name,
        image_size=len(prepared.image_bytes),
        predicted_class=inference['pred_class'],
        confidence_score=round(confidence * 100, 2),
        adenocarcinoma_prob=float(predictions[0]),
        large_cell_prob=float(predictions[1]),
        normal_prob=float(predictions[2]),
        squamous_cell_prob=float(predictions[3]),
        is_uncertain=inference['is_uncertain'],
        image_base64=GradCAM.image_to_base64(inference['original_img']),
        heatmap_base64=heatmap_base64,
        clinical_notes=ModelInference.generate_justification(inference['pred_class'], confidence),
    )


def _prediction_payload(record, prepared, inference, include_heatmap=False):
    payload = {
        'success': True,
        'prediction_id': str(record.id),
        'patient_id': prepared.patient.patient_id,
        'patient_name': prepared.patient.full_name,
        'episode_id': prepared.episode.id,
        'episode_number': prepared.episode.episode_number,
        'predicted_class': inference['pred_class'],
        'confidence_score': round(inference['confidence'] * 100, 2),
        'probabilities': ModelInference.format_predictions(inference['predictions']),
        'justification': record.clinical_notes,
        'message': 'This is a supportive AI prediction. Not a clinical diagnosis.',
        'created_at': record.created_at.isoformat(),
    }

    if include_heatmap:
        payload.update({
            'heatmap': record.heatmap_base64,
            'interpretation': f"The highlighted regions are relevant to the {inference['pred_class']} prediction.",
            'disclaimer': 'This is a supportive AI prediction, not a clinical diagnosis.',
        })

    return payload


def _parse_pagination_params(request):
    try:
        limit = int(request.query_params.get('limit', DEFAULT_PAGE_SIZE))
        page = int(request.query_params.get('page', 1))
    except (TypeError, ValueError):
        raise ValidationError('Pagination values must be numbers')

    limit = min(max(limit, 1), MAX_PAGE_SIZE)
    page = max(page, 1)
    return limit, page


def _is_admin_user(user):
    return user.is_staff or getattr(getattr(user, 'profile', None), 'role', None) == 'admin'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def predict(request):
    """
    Predict lung cancer type from CT image.
    Returns: class prediction, confidence, and probabilities.
    """
    try:
        prepared, err_response = _prepare_prediction_request(request)
        if err_response:
            return err_response

        inference = _run_model_prediction(prepared)
        if inference['is_uncertain']:
            return Response({
                'success': False,
                'error': 'Upload a picture with better quality.',
                'confidence': round(inference['confidence'] * 100, 2)
            })

        prediction_record = _create_prediction_record(request, prepared, inference)
        return Response(_prediction_payload(prediction_record, prepared, inference))

    except ValidationError as exc:
        return Response(
            {'error': ' '.join(exc.messages), 'success': False},
            status=status.HTTP_400_BAD_REQUEST
        )
    except RuntimeError as exc:
        return Response(
            {'error': str(exc), 'success': False},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    except Exception:
        logger.exception("Prediction failed.")
        return Response(
            {'error': 'Prediction failed. Please try again.', 'success': False},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def predict_with_heatmap(request):
    """
    Predict with Grad-CAM heatmap visualization.
    Uses the pre-cached Grad-CAM sub-model for maximum speed.
    """
    try:
        prepared, err_response = _prepare_prediction_request(request)
        if err_response:
            return err_response

        inference = _run_model_prediction(prepared)
        heatmap_base64 = _generate_prediction_heatmap(inference)
        prediction_record = _create_prediction_record(
            request,
            prepared,
            inference,
            heatmap_base64=heatmap_base64,
        )

        return Response(_prediction_payload(
            prediction_record,
            prepared,
            inference,
            include_heatmap=True,
        ))

    except ValidationError as exc:
        return Response(
            {'error': ' '.join(exc.messages), 'success': False},
            status=status.HTTP_400_BAD_REQUEST
        )
    except RuntimeError as exc:
        return Response(
            {'error': str(exc), 'success': False},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception:
        logger.exception("Prediction with heatmap failed.")
        return Response(
            {'error': 'Prediction failed. Please try again.', 'success': False},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== HISTORY & ANALYTICS ENDPOINTS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def prediction_history(request):
    """Get user's prediction history"""
    try:
        limit, page = _parse_pagination_params(request)

        records = (
            PredictionRecord.objects
            .filter(user=request.user)
            .select_related('patient', 'episode')
            .order_by('-created_at')
        )
        total = records.count()

        start = (page - 1) * limit
        end = start + limit
        records = records[start:end]

        data = [record.to_dict() for record in records]

        return Response({
            'total': total,
            'page': page,
            'limit': limit,
            'predictions': data
        })

    except ValidationError as exc:
        return Response({'error': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        logger.exception("Failed to load prediction history.")
        return Response({'error': 'Unable to load prediction history'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def prediction_detail(request, prediction_id):
    """Get detailed prediction information"""
    try:
        record = (
            PredictionRecord.objects
            .select_related('patient', 'episode')
            .get(id=prediction_id, user=request.user)
        )
        return Response(record.to_dict())
    except PredictionRecord.DoesNotExist:
        return Response(
            {'error': 'Prediction not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception:
        logger.exception("Failed to load prediction detail.")
        return Response({'error': 'Unable to load prediction detail'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def model_metrics(request):
    """Get model performance metrics"""
    try:
        records = PredictionRecord.objects.filter(is_uncertain=False)

        if not records.exists():
            return Response({
                'total_predictions': 0,
                'accuracy': 0,
                'metrics': {}
            })

        total_predictions = records.count()
        average_confidence = records.aggregate(avg=Avg('confidence_score'))['avg']

        class_distribution = list(
            records.values('predicted_class')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        confidence_by_class = list(
            records.values('predicted_class')
            .annotate(avg_confidence=Avg('confidence_score'), count=Count('id'))
        )

        return Response({
            'total_predictions': total_predictions,
            'average_confidence': round(average_confidence, 2),
            'class_distribution': class_distribution,
            'confidence_by_class': confidence_by_class,
            'last_updated': timezone.now().isoformat(),
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard summary statistics"""
    try:
        user_predictions = PredictionRecord.objects.filter(user=request.user)

        total = user_predictions.count()
        week_ago = timezone.now() - timedelta(days=7)
        last_week = user_predictions.filter(created_at__gte=week_ago).count()

        avg_confidence = user_predictions.aggregate(avg=Avg('confidence_score'))['avg'] or 0

        class_breakdown = list(
            user_predictions.values('predicted_class')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        uncertain_count = user_predictions.filter(is_uncertain=True).count()

        return Response({
            'total_predictions': total,
            'predictions_last_week': last_week,
            'average_confidence': round(avg_confidence, 2),
            'uncertain_predictions': uncertain_count,
            'class_breakdown': class_breakdown,
            'timestamp': timezone.now().isoformat(),
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ==================== HEALTH & INFO ENDPOINTS ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint"""
    return JsonResponse({
        'status': 'healthy',
        'model_loaded': getattr(model_manager, '_model', None) is not None,
        'gradcam_ready': getattr(model_manager, '_gradcam_layer_model', None) is not None,
        'timestamp': timezone.now().isoformat(),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def api_info(request):
    """API information endpoint"""
    return JsonResponse({
        'name': 'LungScan CT Analysis API',
        'version': '1.1.0',
        'description': 'AI-powered CT-based lung cancer classification system',
        'endpoints': {
            'auth': {
                'register': '/api/register/',
                'login': '/api/login/',
                'logout': '/api/logout/',
                'profile': '/api/profile/',
            },
            'predict': {
                'predict': '/api/predict/',
                'predict_with_heatmap': '/api/predict_heatmap/',
            },
            'analytics': {
                'history': '/api/history/',
                'metrics': '/api/metrics/',
                'dashboard': '/api/dashboard/',
            },
            'patients': {
                'list_create': '/api/patients/',
                'detail': '/api/patients/<patient_id>/',
            },
        },
        'model_classes': ModelInference.CLASS_NAMES,
    })
# ==================== CHAT ASSISTANT ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_assistant(request):
    """
    Upgraded Clinical Assistant with Multi-Model Intelligence (Gemini + OpenAI + Local).
    Prioritizes Gemini 1.5 Flash for performance and accessibility.
    """
    query = request.data.get('message', '').lower().strip()
    user = request.user
    
    if not query:
        return Response({'error': 'No message provided'}, status=status.HTTP_400_BAD_REQUEST)

    # 1. Attempt Google Gemini (Primary)
    gemini_key = os.environ.get('GEMINI_API_KEY')
    if gemini_key and gemini_key != "your_gemini_key_here":
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            prompt = f"You are a specialized Medical AI Assistant for the NSCLC Platform. You assist Dr. {user.username}. You provide expert insights into Lung Cancer (Adenocarcinoma, Squamous Cell, Large Cell). Be professional, clinical, and evidence-based. Keep responses concise but thorough. User query: {query}"
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt
            )
            return Response({
                'response': response.text,
                'source': 'Gemini 1.5 Flash',
                'timestamp': timezone.now()
            })
        except Exception:
            logger.exception("Gemini chat provider failed. Trying OpenAI fallback.")

    # 2. Attempt OpenAI (Secondary)
    openai_key = os.environ.get('OPENAI_API_KEY')
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            completion = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": f"You are a specialized Medical AI Assistant for the NSCLC Platform. You assist Dr. {user.username}. You provide expert insights into Lung Cancer (Adenocarcinoma, Squamous Cell, Large Cell). Be professional, clinical, and evidence-based. Keep responses concise but thorough."},
                    {"role": "user", "content": query}
                ],
                max_tokens=300,
                temperature=0.7
            )
            return Response({
                'response': completion.choices[0].message.content,
                'source': 'OpenAI GPT-4o',
                'timestamp': timezone.now()
            })
        except Exception:
            logger.exception("OpenAI chat provider failed. Falling back to local intent engine.")

    # 3. Local Fallback: Weighted Intent Concept Clusters
    INTENTS = {
        'GREETING': {
            'keywords': ['hi', 'hello', 'hey', 'start', 'greetings', 'morning', 'afternoon'],
            'response': f"Hello, Dr. {user.username}. I'm your Medical AI Assistant. I'm ready to analyze NSCLC pathology and CT features with you."
        },
        'ADENOCARCINOMA': {
            'keywords': ['adeno', 'adenocarcinoma', 'glandular', 'bronchial', 'peripheral'],
            'response': "Adenocarcinoma typically arises from bronchial mucosal glands and is often peripheral. On CT, look for 'ground-glass' opacities or spiculated nodules."
        },
        'SQUAMOUS': {
            'keywords': ['squamous', 'central', 'smoking', 'cavity', 'cavitation', 'endobronchial'],
            'response': "Squamous Cell Carcinoma is often central and endobronchial. It is heavily linked to smoking history and may present as a cavitating mass on CT."
        },
        'LARGE_CELL': {
            'keywords': ['large cell', 'undifferentiated', 'fast', 'growth', 'necrosis'],
            'response': "Large Cell Carcinoma is undifferentiated and grows rapidly. It typically presents as a large peripheral mass with frequent internal necrosis."
        },
        'CT_FEATURES': {
            'keywords': ['look like', 'ct', 'scan', 'features', 'indicators', 'malignant', 'nodule', 'spiculation', 'lobulation'],
            'response': "Malignant CT indicators include irregular/spiculated margins, pleural tail signs, and high density. Solid nodules >8mm require close clinical follow-up."
        },
        'SYMPTOMS': {
            'keywords': ['symptoms', 'signs', 'pain', 'cough', 'blood', 'weight loss', 'dyspnea'],
            'response': "Common clinical signs include persistent cough, hemoptysis, and unexplained weight loss. Many early-stage nodules are asymptomatic and found incidentally."
        },
        'SYSTEM_HELP': {
            'keywords': ['how to', 'help', 'instructions', 'work', 'model', 'accuracy', 'confidence'],
            'response': "Upload a high-resolution axial CT slice in the Analysis Chamber. Our ResNet-50 model will classify the tissue and generate a Grad-CAM heatmap of suspicious regions."
        },
        'GENERAL_CANCER': {
            'keywords': ['what is cancer', 'definition', 'oncology', 'malignancy', 'tumor', 'growth', 'cells'],
            'response': "Cancer is a broad group of diseases characterized by the uncontrolled growth and spread of abnormal cells. If the spread is not controlled, it can result in death. In the context of NSCLC, these abnormalities occur in the lung tissue."
        }
    }

    # Calculate Intent Scores
    best_intent = None
    max_score = 0
    
    for intent_name, data in INTENTS.items():
        score = sum(1 for word in data['keywords'] if word in query)
        if score > max_score:
            max_score = score
            best_intent = intent_name

    # Adaptive Response Generation
    if max_score > 0 and best_intent:
        response = INTENTS[best_intent]['response']
        if max_score > 2:
            response = "Based on your specific query: " + response
    else:
        response = "That is a complex clinical query. While I specialize in NSCLC classification, you might want to cross-reference that with the latest NCCN guidelines for detailed management."

    return Response({
        'response': response,
        'source': 'Local Intent Engine',
        'timestamp': timezone.now()
    })

# ==================== ADMINISTRATIVE & PATIENT MANAGEMENT ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """List all system users (Admin only)"""
    if not _is_admin_user(request.user):
        return Response({'error': 'Unauthorized. Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
    
    users = User.objects.all().select_related('profile')
    data = []
    for u in users:
        data.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'role': u.profile.role if hasattr(u, 'profile') else ('admin' if u.is_staff else 'unknown'),
            'is_active': u.is_active,
            'is_staff': u.is_staff,
            'date_joined': u.date_joined.isoformat()
        })
    return Response(data)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_patients(request):
    """List registered patients or create a new patient with a generated ID."""
    if request.method == 'POST':
        try:
            patient = _create_patient_from_request(request)
        except ValidationError as exc:
            return Response({'error': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(_patient_summary(patient), status=status.HTTP_201_CREATED)

    search = (request.query_params.get('search') or '').strip()
    patients = (
        Patient.objects
        .annotate(
            episode_count_value=Count('episodes', distinct=True),
            scan_count_value=Count('predictions', distinct=True),
            latest_episode_at=Max('episodes__created_at'),
        )
    )
    if search:
        patients = patients.filter(
            Q(patient_id__icontains=search)
            | Q(full_name__icontains=search)
            | Q(national_id__icontains=search)
        )

    return Response([_patient_summary(patient) for patient in patients[:100]])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_detail(request, patient_id):
    """Retrieve a registered patient and recent episodes."""
    try:
        patient = Patient.objects.prefetch_related('episodes').get(patient_id__iexact=patient_id)
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)

    data = _patient_summary(patient)
    data['episodes'] = [episode.to_dict() for episode in patient.episodes.all()[:20]]
    return Response(data)


def _patient_summary(patient):
    latest_episode_at = getattr(patient, 'latest_episode_at', None)
    if latest_episode_at is None:
        latest_episode = patient.episodes.order_by('-created_at').first()
        latest_episode_at = latest_episode.created_at if latest_episode else None

    data = patient.to_dict()
    data.update({
        'last_activity': latest_episode_at.isoformat() if latest_episode_at else patient.updated_at.isoformat(),
        'episode_count': getattr(patient, 'episode_count_value', None) if hasattr(patient, 'episode_count_value') else patient.episodes.count(),
        'scan_count': getattr(patient, 'scan_count_value', None) if hasattr(patient, 'scan_count_value') else patient.predictions.count(),
    })
    return data
