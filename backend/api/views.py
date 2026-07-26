import random
import string
import logging
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from django.db import transaction as db_transaction
from django.shortcuts import redirect
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import CampaignSettings, KitProduct, Donor, Transaction, KitOrderItem
from .serializers import (
    CampaignSettingsSerializer, KitProductSerializer, 
    DonorSerializer, TransactionSerializer
)
from . import pesapal

logger = logging.getLogger(__name__)

def generate_random_reference(prefix="TM"):
    """
    Generates a unique reference, e.g. TM-ABCD-1234
    """
    chars = string.ascii_uppercase + string.digits
    part1 = ''.join(random.choice(chars) for _ in range(4))
    part2 = ''.join(random.choice(chars) for _ in range(4))
    return f"{prefix}-{part1}-{part2}"

class CampaignSettingsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        campaign = CampaignSettings.objects.filter(id=1).first()
        if not campaign:
            return Response({"detail": "Campaign settings not initialized"}, status=status.HTTP_404_NOT_FOUND)
        serializer = CampaignSettingsSerializer(campaign)
        return Response(serializer.data)

class KitProductListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = KitProductSerializer

    def get_queryset(self):
        return KitProduct.objects.filter(active=True).order_by('price')

class CampaignStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        txs = Transaction.objects.filter(status='confirmed', type='donation')
        total_raised = sum(t.amount for t in txs)
        donor_count = txs.values('donor_id').distinct().count()
        donation_count = txs.count()
        average_donation = int(total_raised / donation_count) if donation_count > 0 else 0

        return Response({
            "total_raised": total_raised,
            "donor_count": donor_count,
            "donation_count": donation_count,
            "average_donation": average_donation
        })

class LiveDonationsListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return Transaction.objects.filter(status='confirmed').order_by('-confirmed_at')[:25]

class InitiatePaymentView(APIView):
    permission_classes = [AllowAny]

    @db_transaction.atomic
    def post(self, request):
        data = request.data
        amount = data.get("amount")
        name = data.get("name")
        phone = data.get("phone")
        email = data.get("email")
        payment_mode = data.get("payment_mode") # "mobile" | "card" | "bank"
        kit_id = data.get("kit_id")
        size = data.get("size")
        qty = data.get("qty", 1)
        message = data.get("message")

        if not amount or int(amount) < 500:
            return Response({"detail": "Minimum payment is UGX 500"}, status=status.HTTP_400_BAD_ERROR)

        is_kit = bool(kit_id)
        ref_prefix = "KIT" if is_kit else "TM"
        ref = generate_random_reference(ref_prefix)

        # Enforce name for kit purchases
        if is_kit and (not name or not name.strip()):
            return Response({"detail": "Name is compulsory for kit purchases"}, status=status.HTTP_400_BAD_REQUEST)

        # Create or update Donor
        donor = None
        if name or phone or email:
            donor, _ = Donor.objects.get_or_create(
                phone=phone,
                defaults={"name": name, "email": email}
            )
            # update name/email if empty
            if name and not donor.name:
                donor.name = name
            if email and not donor.email:
                donor.email = email
            donor.save()

        # Create Transaction
        tx_type = 'kit_purchase' if is_kit else 'donation'
        db_payment_method = 'bank' if payment_mode == 'bank' else ('card' if payment_mode == 'card' else 'mtn_momo') # placeholder mapping
        
        transaction_obj = Transaction.objects.create(
            donor=donor,
            type=tx_type,
            amount=int(amount),
            currency='UGX',
            payment_method=db_payment_method,
            status='pending',
            internal_reference=ref,
            message=message,
            is_anonymous=(not bool(name)) if not is_kit else False,
            donor_display_name=name if name else None
        )

        # If kit, create KitOrderItem
        if is_kit:
            try:
                product = KitProduct.objects.get(id=kit_id)
            except KitProduct.DoesNotExist:
                return Response({"detail": "Kit product not found"}, status=status.HTTP_404_NOT_FOUND)

            unit_price = int(amount) // int(qty) if qty else product.price
            KitOrderItem.objects.create(
                transaction=transaction_obj,
                kit_product=product,
                size=size,
                quantity=int(qty),
                unit_price=unit_price
            )

        if payment_mode == 'bank':
            # Read bank details from settings
            campaign = CampaignSettings.objects.filter(id=1).first()
            return Response({
                "reference": ref,
                "bank_name": campaign.bank_name if campaign else "Stanbic Bank Uganda",
                "bank_account_name": campaign.bank_account_name if campaign else "Mengo Senior School — Tambula Mengo",
                "bank_account_number": campaign.bank_account_number if campaign else "9030099999999"
            })
        else:
            # Pesapal integration flow
            try:
                token = pesapal.get_auth_token()
                
                # Callback URL inside backend to process redirect
                backend_callback = request.build_absolute_uri('/api/payments/pesapal-callback/')
                
                # IPN Webhook URL
                backend_ipn = request.build_absolute_uri('/api/payments/pesapal-ipn/')
                
                # Register IPN URL
                ipn_id = pesapal.register_ipn(token, backend_ipn)
                
                # Add 11.67% surcharge, but do not show to the user on our frontend UI
                surcharged_amount = int(float(amount) * 1.1167)

                # Submit Order to Pesapal
                desc = f"Tambula Mengo Run Kit ({size})" if is_kit else "Tambula Mengo Donation"
                pesapal_res = pesapal.submit_order(
                    token=token,
                    ipn_id=ipn_id,
                    reference=ref,
                    amount=surcharged_amount,
                    description=desc,
                    email=email,
                    phone=phone,
                    name=name,
                    redirect_url=backend_callback
                )
                
                # Save order tracking id
                transaction_obj.provider_reference = pesapal_res.get("order_tracking_id")
                transaction_obj.save()
                
                return Response({
                    "reference": ref,
                    "redirect_url": pesapal_res.get("redirect_url")
                })
            except Exception as e:
                logger.error(f"Pesapal payment initiation failed: {e}")
                return Response(
                    {"detail": "Unable to connect to Pesapal payment gateway. Please verify payment settings or try again."},
                    status=status.HTTP_400_BAD_REQUEST
                )

class PesapalIPNView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Pesapal sends parameters as query params or json
        data = request.query_params if request.query_params else request.data
        order_tracking_id = data.get("OrderTrackingId")
        merchant_reference = data.get("OrderMerchantReference")
        notification_type = data.get("OrderNotificationType")

        logger.info(f"Received Pesapal IPN notification: {notification_type} for reference {merchant_reference}")

        if notification_type == "IPNCHANGE" and order_tracking_id:
            try:
                token = pesapal.get_auth_token()
                status_res = pesapal.get_transaction_status(token, order_tracking_id)
                status_code = status_res.get("status_code") # COMPLETED, FAILED, INVALID, PENDING
                
                tx = Transaction.objects.get(internal_reference=merchant_reference)
                
                if status_code == "COMPLETED":
                    tx.status = 'confirmed'
                    tx.confirmed_at = timezone.now()
                    tx.save()
                    logger.info(f"Transaction {merchant_reference} confirmed via IPN webhook.")
                elif status_code in ["FAILED", "INVALID"]:
                    tx.status = 'failed'
                    tx.save()
                    logger.info(f"Transaction {merchant_reference} failed via IPN webhook.")
            except Transaction.DoesNotExist:
                logger.warning(f"Transaction with reference {merchant_reference} not found in database.")
            except Exception as e:
                logger.error(f"Failed to process Pesapal IPN status query: {e}")

        # Pesapal requires a specific JSON response acknowledging receipt
        return Response({
            "OrderTrackingId": order_tracking_id,
            "OrderMerchantReference": merchant_reference,
            "status": 200
        }, status=status.HTTP_200_OK)

    def get(self, request):
        return self.post(request)

class PesapalCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Redirected here after payment
        order_tracking_id = request.query_params.get("OrderTrackingId")
        merchant_ref = request.query_params.get("OrderMerchantReference")
        
        logger.info(f"Redirected back from Pesapal. OrderTrackingId: {order_tracking_id}, MerchantRef: {merchant_ref}")
        
        payment_status = "success"
        if order_tracking_id and merchant_ref:
            try:
                token = pesapal.get_auth_token()
                status_res = pesapal.get_transaction_status(token, order_tracking_id)
                status_code = status_res.get("status_code")
                
                tx = Transaction.objects.get(internal_reference=merchant_ref)
                if status_code == "COMPLETED":
                    tx.status = 'confirmed'
                    tx.confirmed_at = timezone.now()
                    tx.save()
                elif status_code in ["FAILED", "INVALID"]:
                    tx.status = 'failed'
                    tx.save()
                    payment_status = "failed"
            except Exception as e:
                logger.error(f"Error checking transaction status on callback: {e}")
                
        # Redirect user back to React frontend page
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:8080')
        return redirect(f"{frontend_url}/donate?reference={merchant_ref}&status={payment_status}")

class MockConfirmTransactionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Used for offline testing / mock confirm without actual Pesapal redirects
        ref = request.data.get("internal_reference")
        try:
            tx = Transaction.objects.get(internal_reference=ref)
            if tx.status == 'pending':
                tx.status = 'confirmed'
                tx.confirmed_at = timezone.now()
                tx.save()
                return Response({"status": "confirmed"})
            return Response({"status": tx.status})
        except Transaction.DoesNotExist:
            return Response({"detail": "Transaction not found"}, status=status.HTTP_404_NOT_FOUND)
