import uuid
from django.db import models

class CampaignSettings(models.Model):
    id = models.IntegerField(primary_key=True, default=1, editable=False)
    campaign_name = models.CharField(max_length=255, default='Tambula Mengo')
    tagline = models.CharField(max_length=500, blank=True, null=True)
    story = models.TextField(blank=True, null=True)
    goal_amount = models.BigIntegerField()
    offline_amount = models.BigIntegerField(default=0, help_text='Pre-collected / offline donations to add to the fundraising total (UGX)')
    event_date = models.DateField()
    event_details = models.TextField(blank=True, null=True)
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    bank_account_name = models.CharField(max_length=255, blank=True, null=True)
    bank_account_number = models.CharField(max_length=255, blank=True, null=True)
    show_leaderboard_amounts = models.BooleanField(default=True, help_text='Show total amount donated on the public donor leaderboard')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Campaign Settings"
        verbose_name_plural = "Campaign Settings"

    def __str__(self):
        return self.campaign_name

class KitProduct(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.BigIntegerField(help_text='Display price shown on public website (UGX)')
    charge_price = models.BigIntegerField(default=24000, help_text='Actual base price charged during payment collection (UGX) — configurable in Django Admin only')
    size_options = models.JSONField(default=list)  # Stored as JSON array: ["S", "M", "L", "XL"]
    stock = models.IntegerField(blank=True, null=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Display: {self.price} UGX | Charge: {self.charge_price} UGX)"

class Donor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name or self.phone or str(self.id)

class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('donation', 'Donation'),
        ('kit_purchase', 'Kit Purchase'),
    ]
    
    TRANSACTION_STATUS = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('failed', 'Failed'),
    ]
    
    PAYMENT_METHODS = [
        ('mtn_momo', 'MTN MoMo'),
        ('airtel_money', 'Airtel Money'),
        ('bank', 'Bank Transfer'),
        ('card', 'Bank Card'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    donor = models.ForeignKey(Donor, on_delete=models.SET_NULL, blank=True, null=True, related_name='transactions')
    type = models.CharField(max_length=50, choices=TRANSACTION_TYPES)
    amount = models.BigIntegerField()
    currency = models.CharField(max_length=10, default='UGX')
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHODS)
    status = models.CharField(max_length=50, choices=TRANSACTION_STATUS, default='pending')
    provider_reference = models.CharField(max_length=255, blank=True, null=True)  # Store Pesapal tracking ID
    internal_reference = models.CharField(max_length=255, unique=True)
    message = models.TextField(blank=True, null=True)
    is_anonymous = models.BooleanField(default=False)
    donor_display_name = models.CharField(max_length=255, blank=True, null=True)
    kit_collected = models.BooleanField(default=False)
    kit_collected_at = models.DateTimeField(blank=True, null=True)
    kit_collected_by = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.type} - {self.amount} {self.currency} ({self.status})"

class KitOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='order_items')
    kit_product = models.ForeignKey(KitProduct, on_delete=models.PROTECT)
    size = models.CharField(max_length=50, blank=True, null=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.BigIntegerField()
    fulfillment_status = models.CharField(max_length=50, default='ordered')
    picked_up_at = models.DateTimeField(blank=True, null=True)
    picked_up_by = models.CharField(max_length=255, blank=True, null=True)  # Store user info or name

    def __str__(self):
        return f"{self.quantity} x {self.kit_product.name} ({self.size})"
