import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# EgoSMS Uganda API Endpoint
EGOSMS_API_URL = getattr(settings, 'EGOSMS_API_URL', 'https://api.egosms.co/v2/json/')

def get_egosms_credentials():
    username = getattr(settings, 'EGOSMS_USERNAME', '')
    password = getattr(settings, 'EGOSMS_PASSWORD', '')
    sender_id = getattr(settings, 'EGOSMS_SENDER_ID', '')
    return username, password, sender_id

def send_sms(to_phone, message):
    """
    Sends a SMS to a phone number via EgoSMS Uganda API.
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

    # Enforce maximum 159 characters to ensure single-segment SMS delivery (1 SMS credit)
    if len(message) > 159:
        message = message[:156] + "..."

    # Official EgoSMS JSON Payload Structure
    payload = {
        "method": "send_sms",
        "userdata": {
            "username": username,
            "password": password
        },
        "msgdata": [
            {
                "number": clean_phone,
                "message": message
            }
        ]
    }
    if sender_id and sender_id.strip():
        payload["userdata"]["senderid"] = sender_id.strip()

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    logger.info(f"[EgoSMS] Sending SMS ({len(message)} chars) to {clean_phone} via {EGOSMS_API_URL}")
    try:
        response = requests.post(EGOSMS_API_URL, json=payload, headers=headers, timeout=15)
        logger.info(f"[EgoSMS] Response ({response.status_code}): {response.text}")

        # If v2 fails or returns error in response, try flat API POST fallback
        if response.status_code != 200 or "error" in response.text.lower() or "invalid" in response.text.lower():
            flat_payload = {
                "method": "send_sms",
                "username": username,
                "password": password,
                "number": clean_phone,
                "to": clean_phone,
                "message": message
            }
            if sender_id and sender_id.strip():
                flat_payload["sender"] = sender_id.strip()
            
            fallback_res = requests.post("https://www.egosms.co/api/v1/json/", json=flat_payload, headers=headers, timeout=15)
            logger.info(f"[EgoSMS Fallback] Response ({fallback_res.status_code}): {fallback_res.text}")
            return {"success": True, "raw_response": fallback_res.text}

        return {"success": True, "raw_response": response.text}

    except Exception as e:
        logger.error(f"[EgoSMS] Failed to send SMS to {clean_phone}: {e}")
        return {"success": False, "error": str(e)}

def send_kit_purchase_sms(phone, donor_name, kit_name, size, quantity, amount, reference):
    """
    Helper to send a formatted SMS notification to a kit buyer upon payment confirmation.
    Guaranteed <= 159 characters (1 SMS credit).
    """
    short_name = (donor_name.split()[0] if donor_name else "Supporter")[:12]
    size_str = f" ({size})" if size else ""
    qty_str = f"{quantity}x " if quantity and quantity > 1 else ""

    try:
        formatted_amount = f"UGX {int(float(amount)):,}"
    except Exception:
        formatted_amount = f"UGX {amount}"

    message = (
        f"Mengo SS: Dear {short_name}, payment of {formatted_amount} for {qty_str}Kit{size_str} "
        f"is confirmed! Ref:{reference}. Pickup:Pavilion (rep/child pickup & swaps ok). "
        f"Helps:0783279346/0784455449"
    )
    return send_sms(phone, message)

def send_donation_sms(phone, donor_name, amount, reference):
    """
    Helper to send a formatted thanksgiving SMS notification to a donor upon payment confirmation.
    Guaranteed <= 159 characters (1 SMS credit).
    """
    short_name = (donor_name.split()[0] if donor_name else "Supporter")[:12]
    try:
        formatted_amount = f"UGX {int(float(amount)):,}"
    except Exception:
        formatted_amount = f"UGX {amount}"

    message = (
        f"Mengo SS: Dear {short_name}, thank you for your gift of {formatted_amount}! "
        f"Ref:{reference}. Your gift empowers young minds. May God bless you! "
        f"Helps:0783279346/0784455449"
    )
    return send_sms(phone, message)
