import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# EgoSMS Uganda API Endpoint
EGOSMS_API_URL = getattr(settings, 'EGOSMS_API_URL', 'https://api.egosms.co/v2/json/')

def get_egosms_credentials():
    username = getattr(settings, 'EGOSMS_USERNAME', '')
    password = getattr(settings, 'EGOSMS_PASSWORD', '')
    sender_id = getattr(settings, 'EGOSMS_SENDER_ID', 'TambulaMengo')
    return username, password, sender_id

def send_sms(to_phone, message):
    """
    Sends a SMS to a phone number via EgoSMS Uganda JSON API.
    Docs: https://blog.egosms.co/what-is-the-egosms-api-and-who-is-it-for/
    """
    username, password, sender_id = get_egosms_credentials()

    if not username or not password:
        logger.warning("[EgoSMS] Credentials (EGOSMS_USERNAME / EGOSMS_PASSWORD) not configured in backend/.env. SMS skipped.")
        return {"success": False, "detail": "EgoSMS credentials not set"}

    # Format phone number to 2567... format
    clean_phone = str(to_phone).replace("+", "").replace(" ", "").replace("-", "").strip()
    if clean_phone.startswith("0"):
        clean_phone = "256" + clean_phone[1:]

    payload = {
        "method": "send_sms",
        "username": username,
        "password": password,
        "sender": sender_id,
        "to": clean_phone,
        "message": message
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    logger.info(f"[EgoSMS] Sending SMS to {clean_phone} via {EGOSMS_API_URL}")
    try:
        response = requests.post(EGOSMS_API_URL, json=payload, headers=headers, timeout=15)
        logger.info(f"[EgoSMS] Response ({response.status_code}): {response.text}")
        response.raise_for_status()

        try:
            res_json = response.json()
            return {"success": True, "data": res_json, "raw_response": response.text}
        except Exception:
            return {"success": True, "raw_response": response.text}

    except Exception as e:
        logger.error(f"[EgoSMS] Failed to send SMS to {clean_phone}: {e}")
        return {"success": False, "error": str(e)}

def send_kit_purchase_sms(phone, donor_name, kit_name, size, quantity, amount, reference):
    """
    Helper to send a formatted SMS notification to a kit buyer upon payment confirmation.
    Includes helplines, representative pickup policy, and size swap rules.
    """
    name = donor_name or "Supporter"
    size_str = f" (Size {size})" if size else ""
    qty_str = f"{quantity}x " if quantity and quantity > 1 else ""

    try:
        formatted_amount = f"UGX {int(float(amount)):,}"
    except Exception:
        formatted_amount = f"UGX {amount}"

    message = (
        f"Dear {name}, payment of {formatted_amount} for {qty_str}{kit_name}{size_str} "
        f"is confirmed! Ref: {reference}. "
        f"Pickup: Mengo SS Pavilion. Representative/child pickup allowed with QR code. "
        f"Size swaps permitted at pavilion (subject to stock). "
        f"Helplines: +256783279346 / +256784455449. Go Mengo!"
    )
    return send_sms(phone, message)

def send_donation_sms(phone, donor_name, amount, reference):
    """
    Helper to send a formatted SMS notification to a donor upon payment confirmation.
    """
    name = donor_name or "Supporter"
    try:
        formatted_amount = f"UGX {int(float(amount)):,}"
    except Exception:
        formatted_amount = f"UGX {amount}"

    message = (
        f"Dear {name}, we have received your donation of {formatted_amount} "
        f"to Mengo Senior School - Tambula Mengo. "
        f"Ref: {reference}. "
        f"Helplines: +256783279346 / +256784455449. "
        f"May you be abundantly blessed! Thank you."
    )
    return send_sms(phone, message)
