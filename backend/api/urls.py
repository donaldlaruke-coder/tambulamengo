from django.urls import path
from .views import (
    CampaignSettingsView, KitProductListView, CampaignStatsView,
    LiveDonationsListView, InitiatePaymentView, PesapalIPNView,
    PesapalCallbackView, MockConfirmTransactionView
)

urlpatterns = [
    path('campaign/', CampaignSettingsView.as_view(), name='campaign-settings'),
    path('kits/', KitProductListView.as_view(), name='kit-products'),
    path('stats/', CampaignStatsView.as_view(), name='campaign-stats'),
    path('donations/', LiveDonationsListView.as_view(), name='live-donations'),
    path('payments/initiate/', InitiatePaymentView.as_view(), name='initiate-payment'),
    path('payments/pesapal-ipn/', PesapalIPNView.as_view(), name='pesapal-ipn'),
    path('payments/pesapal-callback/', PesapalCallbackView.as_view(), name='pesapal-callback'),
    path('payments/mock-confirm/', MockConfirmTransactionView.as_view(), name='mock-confirm'),
]
