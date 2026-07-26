from django.urls import path
from .views import (
    CampaignSettingsView, KitProductListView, CampaignStatsView,
    LiveDonationsListView, InitiatePaymentView, PesapalIPNView,
    PesapalCallbackView, VerifyTransactionView,
    AdminLoginView, AdminLogoutView, AdminMeView,
    AdminStatsView, AdminTransactionsView,
    AdminConfirmTransactionView, AdminRejectTransactionView,
    AdminKitsView, AdminKitToggleView, AdminCampaignView
)

urlpatterns = [
    path('campaign/', CampaignSettingsView.as_view(), name='campaign-settings'),
    path('kits/', KitProductListView.as_view(), name='kit-products'),
    path('stats/', CampaignStatsView.as_view(), name='campaign-stats'),
    path('donations/', LiveDonationsListView.as_view(), name='live-donations'),
    path('payments/initiate/', InitiatePaymentView.as_view(), name='initiate-payment'),
    path('payments/verify/', VerifyTransactionView.as_view(), name='verify-payment'),
    path('payments/pesapal-ipn/', PesapalIPNView.as_view(), name='pesapal-ipn'),
    path('payments/pesapal-callback/', PesapalCallbackView.as_view(), name='pesapal-callback'),
    # Admin API endpoints
    path('admin-api/login/', AdminLoginView.as_view(), name='admin-login'),
    path('admin-api/logout/', AdminLogoutView.as_view(), name='admin-logout'),
    path('admin-api/me/', AdminMeView.as_view(), name='admin-me'),
    path('admin-api/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('admin-api/transactions/', AdminTransactionsView.as_view(), name='admin-transactions'),
    path('admin-api/confirm/', AdminConfirmTransactionView.as_view(), name='admin-confirm'),
    path('admin-api/reject/', AdminRejectTransactionView.as_view(), name='admin-reject'),
    path('admin-api/kits/', AdminKitsView.as_view(), name='admin-kits'),
    path('admin-api/kit-toggle/', AdminKitToggleView.as_view(), name='admin-kit-toggle'),
    path('admin-api/campaign/', AdminCampaignView.as_view(), name='admin-campaign'),
]
