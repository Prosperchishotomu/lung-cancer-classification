from django.urls import path
from . import views

urlpatterns = [
    # ===== AUTHENTICATION =====
    path('register/', views.register_user, name='register'),
    path('login/', views.login_user, name='login'),
    path('logout/', views.logout_user, name='logout'),
    path('profile/', views.user_profile, name='profile'),
    
    # ===== PREDICTION =====
    path('predict/', views.predict, name='predict'),
    path('predict_heatmap/', views.predict_with_heatmap, name='predict_heatmap'),
    
    # ===== HISTORY & ANALYTICS =====
    path('history/', views.prediction_history, name='history'),
    path('prediction/<str:prediction_id>/', views.prediction_detail, name='prediction_detail'),
    path('metrics/', views.model_metrics, name='metrics'),
    path('dashboard/', views.dashboard_stats, name='dashboard'),
    
    # ===== HEALTH & INFO =====
    path('health/', views.health_check, name='health'),
    path('info/', views.api_info, name='info'),
    
    # ===== MANAGEMENT =====
    path('users/', views.list_users, name='list_users'),
    path('patients/', views.list_patients, name='list_patients'),
    path('patients/<str:patient_id>/', views.patient_detail, name='patient_detail'),
    
    # ===== CHAT ASSISTANT =====
    path('chat/', views.chat_assistant, name='chat'),
]
