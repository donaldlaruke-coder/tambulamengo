import random
import string
import logging
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from django.db import transaction as db_transaction
from django.shortcuts import redirect
from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return  # Bypass CSRF enforcement for API views using session authentication

from .models import CampaignSettings, KitProduct, Donor, Transaction, KitOrderItem
from .serializers import (
    CampaignSettingsSerializer, KitProductSerializer, 
    DonorSerializer, TransactionSerializer
)
from . import pesapal
from . import yo_payments
from . import egosms

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
            return Response({"detail": "Minimum payment is UGX 500"}, status=status.HTTP_400_BAD_REQUEST)

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
            # Yo! Payments Integration Flow (Mobile Money USSD Push)
            try:
                backend_ipn = request.build_absolute_uri('/api/payments/yo-ipn/')
                if backend_ipn.startswith("http://") and "tambulamengo.work.gd" in backend_ipn:
                    backend_ipn = backend_ipn.replace("http://", "https://")

                narrative = f"Tambula Mengo Run Kit ({size})" if is_kit else "Tambula Mengo Donation"
                target_phone = phone or (donor.phone if donor else "0770000000")

                # Add 11.67% surcharge to amount sent to Yo! Payments API (hidden from frontend UI)
                # YOU CAN ADJUST THIS PERCENTAGE MULTIPLIER BELOW (e.g., 11.67 = 11.67% fee)
                SURCHARGE_PERCENTAGE = 11.67
                surcharged_amount = int(round(float(amount) * (1 + SURCHARGE_PERCENTAGE / 100)))

                yo_res = yo_payments.deposit_funds(
                    reference=ref,
                    amount=surcharged_amount,
                    phone=target_phone,
                    narrative=narrative,
                    ipn_url=backend_ipn
                )

                transaction_obj.provider_reference = yo_res.get("transaction_reference") or yo_res.get("issued_id")
                transaction_obj.save()

                return Response({
                    "reference": ref,
                    "gateway": "yo",
                    "status": "pending",
                    "message": "A USSD payment prompt has been sent to your phone. Please enter your Mobile Money PIN to authorize the payment."
                })
            except Exception as e:
                logger.error(f"Yo! Payments payment initiation failed: {e}")
                return Response(
                    {"detail": f"Yo! Payments failed: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

# ───────────────────── Helper: Auto-check Pesapal status ─────────────────────

def check_and_update_pesapal_transaction(tx):
    """
    Queries Pesapal API v3 for transaction status if currently pending.
    Updates database record status, confirmed_at, provider_reference, and payment_method if completed.
    """
    if not tx or tx.status in ['confirmed', 'failed'] or not tx.provider_reference:
        return tx

    # Skip Pesapal check safely if Pesapal keys are not configured
    if not getattr(settings, 'PESAPAL_CONSUMER_KEY', ''):
        return tx

    try:
        token = pesapal.get_auth_token()
        status_res = pesapal.get_transaction_status(token, tx.provider_reference)
        logger.info(f"Pesapal status query for {tx.internal_reference}: {status_res}")

        status_code = status_res.get("status_code")
        payment_status_desc = str(status_res.get("payment_status_description", "")).upper()

        # Pesapal API V3 status code 1 = Completed, 2 = Failed, 0 = Pending
        # Also payment_status_description = "Completed" or "COMPLETED"
        is_completed = (
            status_code in [1, "1", "COMPLETED", "Completed"] or
            payment_status_desc == "COMPLETED" or
            "COMPLETED" in payment_status_desc or
            status_res.get("status") == "200" and payment_status_desc == "COMPLETED"
        )
        is_failed = (
            status_code in [2, "2", "FAILED", "Failed", "INVALID", "Invalid"] or
            payment_status_desc in ["FAILED", "INVALID"] or
            "FAILED" in payment_status_desc
        )

        if is_completed:
            tx.status = 'confirmed'
            if not tx.confirmed_at:
                tx.confirmed_at = timezone.now()

            # Extract confirmation code / mobile money receipt code if provided
            confirmation_code = status_res.get("confirmation_code") or status_res.get("payment_account")
            if confirmation_code and not tx.provider_reference:
                tx.provider_reference = confirmation_code

            # Extract actual payment method if available
            pm = str(status_res.get("payment_method", "")).lower()
            if "momo" in pm or "mtn" in pm:
                tx.payment_method = "mtn_momo"
            elif "airtel" in pm:
                tx.payment_method = "airtel_money"
            elif "card" in pm or "visa" in pm or "master" in pm:
                tx.payment_method = "card"

            tx.save()
            logger.info(f"Transaction {tx.internal_reference} auto-confirmed via Pesapal query.")
        elif is_failed:
            tx.status = 'failed'
            tx.save()
            logger.info(f"Transaction {tx.internal_reference} marked as FAILED via Pesapal query.")
    except Exception as e:
        logger.error(f"Failed auto-checking Pesapal transaction status for {tx.internal_reference}: {e}")

# ───────────────────── Helper: Auto-check Yo! Payments status ─────────────────────

def check_and_update_yo_transaction(tx):
    """
    Queries Yo! Payments for transaction status if currently pending.
    Updates database record status, confirmed_at, provider_reference if completed.
    """
    if not tx or tx.status in ['confirmed', 'failed']:
        return tx

    try:
        status_res = yo_payments.check_transaction_status(tx.internal_reference, tx.provider_reference)
        logger.info(f"Yo! Payments status query for {tx.internal_reference}: {status_res}")

        tx_status = str(status_res.get("transaction_status", "")).upper()
        if tx_status in ["SUCCEEDED", "SUCCESS", "COMPLETED"]:
            tx.status = 'confirmed'
            if not tx.confirmed_at:
                tx.confirmed_at = timezone.now()
            if status_res.get("momo_ref") and not tx.provider_reference:
                tx.provider_reference = status_res.get("momo_ref")
            tx.save()
            logger.info(f"Transaction {tx.internal_reference} auto-confirmed via Yo! Payments check.")
        elif tx_status in ["FAILED", "CANCELLED", "REJECTED"]:
            tx.status = 'failed'
            tx.save()
            logger.info(f"Transaction {tx.internal_reference} marked FAILED via Yo! Payments check.")
    except Exception as e:
        logger.error(f"Error checking Yo! Payments status for {tx.internal_reference}: {e}")

    return tx


@method_decorator(csrf_exempt, name='dispatch')
class YoIPNView(APIView):
    """
    Yo! Payments Instant Payment Notification (IPN) Listener.

    Per API section 6.3.2: When a payment is confirmed, this view responds with
    a URL-encoded 'narrative' body. Yo! Payments reads this and automatically
    sends that text as an SMS to the payer's mobile phone.
    """
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def sms_response(self, sms_text):
        """
        Build the special IPN response that triggers an SMS to the payer.
        Yo! Payments sends this exact text as an SMS to the payer's phone.

        ════════════════════════════════════════════════════════════════
        ✏️  TO EDIT THE SMS MESSAGE, scroll down to handle_ipn() below
            and find the section marked:  ── SMS MESSAGE TEMPLATES ──
        ════════════════════════════════════════════════════════════════
        """
        from urllib.parse import urlencode
        from django.http import HttpResponse
        body = urlencode({"narrative": sms_text})
        logger.info(f"[Yo! IPN] Sending SMS trigger response: {sms_text}")
        return HttpResponse(body, content_type="application/x-www-form-urlencoded", status=200)

    def handle_ipn(self, request):
        from django.http import HttpResponse

        d = request.POST or request.data or request.query_params
        logger.info(f"[Yo! IPN] Incoming notification — raw data: {dict(d)}")

        # ── Parse all standard Yo! IPN variables ──────────────────────
        tx_status = str(
            d.get("transaction_status") or d.get("TransactionStatus") or ""
        ).strip().upper()

        external_ref = (
            d.get("external_reference")
            or d.get("external_ref")
            or d.get("ExternalReference")
            or d.get("DepositTransactionSucceededExternalReference")
        )

        yo_tx_ref = (
            d.get("transaction_reference")
            or d.get("TransactionReference")
            or d.get("transaction_initiation_id")
        )

        mno_ref = (
            d.get("MNOTransactionReferenceId")
            or d.get("network_ref")
            or d.get("mno_ref")
        )

        amount    = d.get("amount") or d.get("Amount")
        error_msg = d.get("error") or d.get("Error") or d.get("StatusDetail")

        logger.info(
            f"[Yo! IPN] external_ref={external_ref} | status={tx_status} | "
            f"yo_ref={yo_tx_ref} | mno_ref={mno_ref} | amount={amount} | error={error_msg}"
        )

        if not external_ref:
            logger.warning("[Yo! IPN] No external_reference — ignoring.")
            return HttpResponse("OK", status=200)

        tx = Transaction.objects.filter(internal_reference=external_ref).first()
        if not tx:
            logger.warning(f"[Yo! IPN] No transaction found for: {external_ref}")
            return HttpResponse("OK", status=200)

        # Save best available provider reference
        provider_ref = mno_ref or yo_tx_ref
        if provider_ref and not tx.provider_reference:
            tx.provider_reference = provider_ref

        # ── Lookup donor info for personalised SMS ─────────────────────
        donor = tx.donor
        donor_name = (
            (donor.name if donor else None)
            or tx.donor_display_name
            or "Supporter"
        )
        tx_ref = tx.internal_reference

        # Format the amount nicely e.g. UGX 50,000
        try:
            formatted_amount = f"UGX {int(float(tx.amount or amount or 0)):,}"
        except Exception:
            formatted_amount = f"UGX {tx.amount or amount or ''}"

        is_kit = tx.type == 'kit_purchase'

        # ── Handle status ──────────────────────────────────────────────
        if tx_status in ["SUCCEEDED", "SUCCESS", "COMPLETED"]:
            tx.status = 'confirmed'
            if not tx.confirmed_at:
                tx.confirmed_at = timezone.now()
            tx.save()
            logger.info(f"[Yo! IPN] ✅ {external_ref} CONFIRMED. MNO ref: {mno_ref}")

            # ════════════════════════════════════════════════════════════
            # ✏️  ── SMS MESSAGE TEMPLATES ────────────────────────────────
            #   Edit these messages to whatever you want Yo! to SMS
            #   to the payer's phone after their payment is confirmed.
            #
            #   Available variables:
            #     donor_name       → payer's name (e.g. "John Ssali")
            #     formatted_amount → e.g. "UGX 50,000"
            #     tx_ref           → your internal reference
            #     mno_ref          → MTN/Airtel transaction code
            # ════════════════════════════════════════════════════════════

            if is_kit:
                # SMS for kit / run registration payments
                sms = (
                    f"Dear {donor_name}, your kit payment of {formatted_amount} "
                    f"for Tambula Mengo Run is confirmed! "
                    f"Ref: {tx_ref}. "
                    f"Pickup at Mengo SS Pavilion (rep/child pickup & size swaps allowed). "
                    f"Helplines: +256783279346 / +256784455449. Thank you!"
                )
            else:
                # SMS for general donations
                sms = (
                    f"Dear {donor_name}, on behalf of Mengo Senior School, teachers & students, "
                    f"we express our deepest gratitude for your gift of {formatted_amount}! "
                    f"Ref: {tx_ref}. "
                    f"Your gift empowers young minds. May you be abundantly blessed! 'Akwana Akira Ayomba'. "
                    f"Helplines: +256783279346 / +256784455449."
                )

            # 📱 Trigger EgoSMS Gateway (JSON API) if configured
            try:
                target_phone = (donor.phone if donor else None) or account
                if target_phone:
                    if is_kit:
                        first_item = tx.order_items.first()
                        kit_name = first_item.kit_product.name if (first_item and first_item.kit_product) else "Tambula Mengo Run Kit"
                        size = first_item.size if first_item else ""
                        quantity = first_item.quantity if first_item else 1
                        egosms.send_kit_purchase_sms(target_phone, donor_name, kit_name, size, quantity, tx.amount, tx_ref)
                    else:
                        egosms.send_donation_sms(target_phone, donor_name, tx.amount, tx_ref)
            except Exception as sms_err:
                logger.error(f"[EgoSMS] Error sending SMS: {sms_err}")

            # ════════════════════════════════════════════════════════════
            # Respond with the SMS trigger (do NOT change this line)
            return self.sms_response(sms)

        elif tx_status in ["FAILED", "CANCELLED", "REJECTED", "INSUFFICIENT_BALANCE"]:
            tx.status = 'failed'
            tx.message = error_msg or tx_status
            tx.save()
            logger.info(f"[Yo! IPN] ❌ {external_ref} FAILED: {error_msg or tx_status}")

        elif tx_status == "PENDING":
            tx.save()
            logger.info(f"[Yo! IPN] ⏳ {external_ref} PENDING — checking later.")
            check_and_update_yo_transaction(tx)

        else:
            logger.warning(f"[Yo! IPN] Unknown status '{tx_status}' for {external_ref} — live check.")
            tx.save()
            check_and_update_yo_transaction(tx)

        return HttpResponse("OK", status=200)

    def post(self, request):
        return self.handle_ipn(request)

    def get(self, request):
        return self.handle_ipn(request)



@method_decorator(csrf_exempt, name='dispatch')
class RegisterIPNView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            token = pesapal.get_auth_token()
            backend_ipn = request.build_absolute_uri('/api/payments/pesapal-ipn/')
            if backend_ipn.startswith("http://") and "tambulamengo.work.gd" in backend_ipn:
                backend_ipn = backend_ipn.replace("http://", "https://")

            ipn_id = pesapal.register_ipn(token, backend_ipn)
            logger.info(f"Registered Pesapal IPN URL: {backend_ipn} -> IPN_ID: {ipn_id}")
            return Response({
                "success": True,
                "ipn_url": backend_ipn,
                "ipn_id": ipn_id
            })
        except Exception as e:
            logger.error(f"Error registering IPN URL with Pesapal: {e}")
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        return self.get(request)


class PesapalIPNView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.query_params if request.query_params else request.data
        order_tracking_id = data.get("OrderTrackingId")
        merchant_reference = data.get("OrderMerchantReference")
        notification_type = data.get("OrderNotificationType")

        logger.info(f"Received Pesapal IPN notification: {notification_type} for ref {merchant_reference}, tracking ID {order_tracking_id}")

        if merchant_reference:
            tx = Transaction.objects.filter(internal_reference=merchant_reference).first()
            if tx:
                if order_tracking_id and not tx.provider_reference:
                    tx.provider_reference = order_tracking_id
                    tx.save()
                check_and_update_pesapal_transaction(tx)
        elif order_tracking_id:
            tx = Transaction.objects.filter(provider_reference=order_tracking_id).first()
            if tx:
                check_and_update_pesapal_transaction(tx)

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
        order_tracking_id = request.query_params.get("OrderTrackingId")
        merchant_ref = request.query_params.get("OrderMerchantReference")

        logger.info(f"Redirected back from Pesapal. OrderTrackingId: {order_tracking_id}, MerchantRef: {merchant_ref}")

        payment_status = "success"
        if merchant_ref:
            tx = Transaction.objects.filter(internal_reference=merchant_ref).first()
            if tx:
                if order_tracking_id and not tx.provider_reference:
                    tx.provider_reference = order_tracking_id
                    tx.save()
                tx = check_and_update_pesapal_transaction(tx)
                if tx.status == "failed":
                    payment_status = "failed"

        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://tambulamengo.work.gd')
        return redirect(f"{frontend_url}/donate?reference={merchant_ref}&status={payment_status}")


class VerifyTransactionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        reference = request.query_params.get("reference")
        if not reference:
            return Response({"detail": "Reference parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tx = Transaction.objects.get(internal_reference=reference)
            if tx.status == 'pending':
                tx = check_and_update_yo_transaction(tx)
                if tx.status == 'pending':
                    tx = check_and_update_pesapal_transaction(tx)

            donor = tx.donor

            # Fetch kit order items if kit purchase
            items = []
            if tx.type == 'kit_purchase':
                for item in tx.order_items.all():
                    items.append({
                        "kit_name": item.kit_product.name if item.kit_product else "Run Kit",
                        "size": item.size,
                        "quantity": item.quantity,
                        "unit_price": item.unit_price,
                        "fulfillment_status": item.fulfillment_status,
                        "picked_up_at": item.picked_up_at.isoformat() if item.picked_up_at else None
                    })

            donor_name = tx.donor_display_name or (donor.name if donor else None) or "Anonymous"
            donor_phone = donor.phone if donor else None
            donor_email = donor.email if donor else None

            type_display = "Kit Purchase" if tx.type == 'kit_purchase' else "Donation"
            confirmation_code = tx.provider_reference or tx.internal_reference

            return Response({
                "reference": tx.internal_reference,
                "type": tx.type,
                "type_display": type_display,
                "status": tx.status,
                "amount": tx.amount,
                "currency": tx.currency,
                "payment_method": tx.payment_method,
                "provider_reference": tx.provider_reference,
                "confirmation_code": confirmation_code,
                "donor_name": donor_name,
                "donor_phone": donor_phone,
                "donor_email": donor_email,
                "message": tx.message,
                "created_at": tx.created_at.isoformat(),
                "confirmed_at": tx.confirmed_at.isoformat() if tx.confirmed_at else None,
                "items": items
            })
        except Transaction.DoesNotExist:
            return Response({"detail": "Transaction not found"}, status=status.HTTP_404_NOT_FOUND)


# ───────────────────── Admin API Views ─────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class AdminLoginView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return Response({'success': True, 'username': user.username, 'is_staff': user.is_staff})
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@method_decorator(csrf_exempt, name='dispatch')
class AdminLogoutView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response({'success': True})


class AdminMeView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            return Response({
                'authenticated': True,
                'username': request.user.username,
                'is_staff': request.user.is_staff
            })
        return Response({'authenticated': False})


class AdminStatsView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        confirmed = Transaction.objects.filter(status='confirmed')
        total_raised = sum(t.amount for t in confirmed)
        donor_count = confirmed.values('donor_id').distinct().count()
        donation_count = confirmed.count()
        average_donation = int(total_raised / donation_count) if donation_count > 0 else 0
        kit_orders_count = confirmed.filter(type='kit_purchase').count()
        pending_count = Transaction.objects.filter(status='pending').count()

        return Response({
            'total_raised': total_raised,
            'donor_count': donor_count,
            'donation_count': donation_count,
            'average_donation': average_donation,
            'kit_orders_count': kit_orders_count,
            'pending_count': pending_count,
        })


class AdminTransactionsView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        # Auto-check any pending transactions against Yo! Payments and Pesapal
        pending_txs = Transaction.objects.filter(status='pending')
        for p_tx in pending_txs[:20]:
            p_tx = check_and_update_yo_transaction(p_tx)
            if p_tx.status == 'pending' and p_tx.provider_reference:
                check_and_update_pesapal_transaction(p_tx)

        txs = Transaction.objects.select_related('donor').order_by('-created_at')[:500]
        result = []
        for t in txs:
            result.append({
                'id': str(t.id),
                'internal_reference': t.internal_reference,
                'provider_reference': t.provider_reference,
                'amount': t.amount,
                'type': t.type,
                'payment_method': t.payment_method,
                'status': t.status,
                'message': t.message,
                'is_anonymous': t.is_anonymous,
                'donor_display_name': t.donor_display_name,
                'donor_name': t.donor.name if t.donor else None,
                'donor_phone': t.donor.phone if t.donor else None,
                'donor_email': t.donor.email if t.donor else None,
                'created_at': t.created_at.isoformat(),
                'confirmed_at': t.confirmed_at.isoformat() if t.confirmed_at else None,
            })
        return Response(result)


@method_decorator(csrf_exempt, name='dispatch')
class AdminConfirmTransactionView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def post(self, request):
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        tx_id = request.data.get('id')
        try:
            tx = Transaction.objects.get(id=tx_id)
            tx.status = 'confirmed'
            tx.confirmed_at = timezone.now()
            tx.save()
            return Response({'success': True})
        except Transaction.DoesNotExist:
            return Response({'detail': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)


@method_decorator(csrf_exempt, name='dispatch')
class AdminRejectTransactionView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def post(self, request):
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        tx_id = request.data.get('id')
        try:
            tx = Transaction.objects.get(id=tx_id)
            tx.status = 'failed'
            tx.save()
            return Response({'success': True})
        except Transaction.DoesNotExist:
            return Response({'detail': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)


@method_decorator(csrf_exempt, name='dispatch')
class AdminKitsView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        kits = KitProduct.objects.order_by('created_at')
        result = [{
            'id': str(k.id), 'name': k.name, 'description': k.description,
            'price': k.price, 'size_options': k.size_options, 'stock': k.stock, 'active': k.active
        } for k in kits]
        return Response(result)

    def post(self, request):
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        KitProduct.objects.create(
            name=request.data.get('name', 'Run Kit'),
            description=request.data.get('description'),
            price=int(request.data.get('price', 30000)),
            size_options=request.data.get('size_options', []),
        )
        return Response({'success': True}, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class AdminKitToggleView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def post(self, request):
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        kit_id = request.data.get('id')
        active = request.data.get('active', True)
        try:
            kit = KitProduct.objects.get(id=kit_id)
            kit.active = active
            kit.save()
            return Response({'success': True})
        except KitProduct.DoesNotExist:
            return Response({'detail': 'Kit not found'}, status=status.HTTP_404_NOT_FOUND)


@method_decorator(csrf_exempt, name='dispatch')
class AdminCampaignView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        campaign = CampaignSettings.objects.filter(id=1).first()
        if not campaign:
            return Response({'detail': 'Not configured'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'campaign_name': campaign.campaign_name, 'tagline': campaign.tagline,
            'story': campaign.story, 'goal_amount': campaign.goal_amount,
            'event_date': str(campaign.event_date), 'event_details': campaign.event_details,
            'bank_name': campaign.bank_name, 'bank_account_name': campaign.bank_account_name,
            'bank_account_number': campaign.bank_account_number,
        })

    def post(self, request):
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        campaign, _ = CampaignSettings.objects.get_or_create(id=1, defaults={
            'goal_amount': 0, 'event_date': '2026-08-15'
        })
        d = request.data
        for field in ['campaign_name', 'tagline', 'story', 'event_details',
                       'bank_name', 'bank_account_name', 'bank_account_number']:
            if field in d:
                setattr(campaign, field, d[field])

        if 'goal_amount' in d:
            try:
                val = d['goal_amount']
                campaign.goal_amount = int(val) if val != '' and val is not None else 0
            except (ValueError, TypeError):
                pass

        if 'event_date' in d and d['event_date']:
            try:
                campaign.event_date = d['event_date']
            except (ValueError, TypeError):
                pass

        campaign.save()
        return Response({'success': True})


@method_decorator(csrf_exempt, name='dispatch')
class AdminScanKitView(APIView):
    """
    Admin QR Scan / Kit Fulfillment Endpoint.
    Scans or checks a kit transaction reference.
    Marks kit_collected = True and records timestamp & admin username.
    Prevents duplicate pick-ups / reuse of QR codes.
    """
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def post(self, request):
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response({'detail': 'Staff login required to scan and mark kits.'}, status=status.HTTP_403_FORBIDDEN)
        
        reference = str(request.data.get('reference', '')).strip()
        if not reference:
            return Response({'detail': 'Reference is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if "ref=" in reference:
            reference = reference.split("ref=")[-1].split("&")[0]

        tx = Transaction.objects.filter(internal_reference=reference).first()
        if not tx:
            tx = Transaction.objects.filter(provider_reference=reference).first()

        if not tx:
            return Response({'detail': f'No transaction found matching reference "{reference}".'}, status=status.HTTP_404_NOT_FOUND)

        if tx.status != 'confirmed':
            return Response({'detail': f'Transaction status is "{tx.status.upper()}". Kit collection requires a CONFIRMED transaction.'}, status=status.HTTP_400_BAD_REQUEST)

        if tx.type != 'kit_purchase':
            return Response({'detail': 'This transaction is a general donation, not a kit purchase.'}, status=status.HTTP_400_BAD_REQUEST)

        donor_name = (tx.donor.name if tx.donor else None) or tx.donor_display_name or "Valued Supporter"
        donor_phone = (tx.donor.phone if tx.donor else None) or "N/A"
        
        items = []
        for item in tx.order_items.all():
            items.append({
                "name": item.kit_product.name if item.kit_product else "Run Kit",
                "size": item.size or "N/A",
                "quantity": item.quantity,
                "unit_price": item.unit_price
            })

        # CHECK IF ALREADY PICKED UP / COLLECTED
        if tx.kit_collected:
            picked_time_str = tx.kit_collected_at.strftime("%Y-%m-%d %H:%M:%S") if tx.kit_collected_at else "Earlier"
            return Response({
                'success': False,
                'already_picked': True,
                'message': f'⚠️ ALREADY COLLECTED! This kit was picked up on {picked_time_str} by {tx.kit_collected_by or "Admin"}. This QR code is UNUSABLE again.',
                'reference': tx.internal_reference,
                'donor_name': donor_name,
                'donor_phone': donor_phone,
                'picked_at': str(tx.kit_collected_at),
                'picked_by': tx.kit_collected_by,
                'items': items,
                'amount': tx.amount
            }, status=status.HTTP_200_OK)

        # MARK AS PICKED UP NOW
        now = timezone.now()
        tx.kit_collected = True
        tx.kit_collected_at = now
        tx.kit_collected_by = request.user.username
        tx.save()

        for item in tx.order_items.all():
            item.fulfillment_status = 'picked_up'
            item.picked_up_at = now
            item.picked_up_by = request.user.username
            item.save()

        return Response({
            'success': True,
            'already_picked': False,
            'message': '✅ KIT VERIFIED & MARKED AS PICKED UP!',
            'reference': tx.internal_reference,
            'donor_name': donor_name,
            'donor_phone': donor_phone,
            'picked_at': str(now),
            'picked_by': request.user.username,
            'items': items,
            'amount': tx.amount
        }, status=status.HTTP_200_OK)

