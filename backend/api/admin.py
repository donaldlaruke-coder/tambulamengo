from django.contrib import admin
from .models import CampaignSettings, KitProduct, Donor, Transaction, KitOrderItem

@admin.register(CampaignSettings)
class CampaignSettingsAdmin(admin.ModelAdmin):
    list_display = ('campaign_name', 'goal_amount', 'event_date', 'bank_name', 'bank_account_number', 'updated_at')

@admin.register(KitProduct)
class KitProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'stock', 'active', 'created_at')
    list_filter = ('active',)
    search_fields = ('name', 'description')

class KitOrderItemInline(admin.TabularInline):
    model = KitOrderItem
    extra = 0
    readonly_fields = ('kit_product', 'size', 'quantity', 'unit_price', 'fulfillment_status', 'picked_up_at', 'picked_up_by')

@admin.register(Donor)
class DonorAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'email', 'created_at')
    search_fields = ('name', 'phone', 'email')
    ordering = ('-created_at',)

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        'internal_reference', 'type', 'donor_display_name', 'get_phone', 
        'amount', 'currency', 'status', 'payment_method', 
        'provider_reference', 'confirmed_at', 'created_at'
    )
    list_filter = ('status', 'type', 'payment_method', 'created_at')
    search_fields = (
        'internal_reference', 'provider_reference', 
        'donor_display_name', 'donor__name', 'donor__phone', 'donor__email'
    )
    ordering = ('-created_at',)
    inlines = [KitOrderItemInline]
    readonly_fields = ('created_at',)

    def get_phone(self, obj):
        return obj.donor.phone if obj.donor else '-'
    get_phone.short_description = 'Phone'

@admin.register(KitOrderItem)
class KitOrderItemAdmin(admin.ModelAdmin):
    list_display = ('transaction', 'kit_product', 'size', 'quantity', 'fulfillment_status', 'picked_up_at', 'picked_up_by')
    list_filter = ('fulfillment_status', 'size')
    search_fields = ('transaction__internal_reference', 'kit_product__name', 'picked_up_by')
