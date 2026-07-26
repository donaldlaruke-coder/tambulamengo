from rest_framework import serializers
from .models import CampaignSettings, KitProduct, Donor, Transaction, KitOrderItem

class CampaignSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignSettings
        fields = [
            'id', 'campaign_name', 'tagline', 'story', 
            'goal_amount', 'event_date', 'event_details', 
            'updated_at'
        ]

class KitProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = KitProduct
        fields = ['id', 'name', 'description', 'price', 'size_options', 'stock', 'active', 'created_at']

class DonorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donor
        fields = ['id', 'name', 'phone', 'email', 'created_at']

class KitOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = KitOrderItem
        fields = [
            'id', 'transaction', 'kit_product', 'size', 
            'quantity', 'unit_price', 'fulfillment_status',
            'picked_up_at', 'picked_up_by'
        ]
        read_only_fields = ['transaction']

class TransactionSerializer(serializers.ModelSerializer):
    order_items = KitOrderItemSerializer(many=True, required=False)
    donor_details = DonorSerializer(source='donor', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'donor', 'donor_details', 'type', 'amount', 'currency', 
            'payment_method', 'status', 'provider_reference', 
            'internal_reference', 'message', 'is_anonymous', 
            'donor_display_name', 'created_at', 'confirmed_at', 
            'order_items'
        ]
        read_only_fields = ['internal_reference', 'provider_reference', 'status', 'confirmed_at']
