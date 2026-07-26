from django.urls import path
from .views import (
    CampaignSettingsView, KitProductListView, CampaignStatsView,
    LiveDonationsListView, InitiatePaymentView, PesapalIPNView,
    PesapalCallbackView, VerifyTransactionView
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
]

