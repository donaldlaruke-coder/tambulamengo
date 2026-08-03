import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# EgoSMS Uganda Verified Working API Endpoint
EGOSMS_API_URL = getattr(settings, 'EGOSMS_API_URL', 'https://comms.egosms.co/api/v1/plain/')

def get_egosms_credentials():
    username = getattr(settings, 'EGOSMS_USERNAME', '')
    password = getattr(settings, 'EGOSMS_PASSWORD', '')
    sender_id = getattr(settings, 'EGOSMS_SENDER_ID', '')
    return username, password, sender_id

def send_sms(to_phone, message):
    """
    Sends an SMS via EgoSMS API (Method: sendsms).
    Docs: https://developers.pahappa.com/
    """
    username, password, sender_id = get_egosms_credentials()

    if not username or not password:
        logger.warning("[EgoSMS] Credentials (EGOSMS_USERNAME / EGOSMS_PASSWORD) not configured in backend/.env. SMS skipped.")
        return {"success": False, "detail": "EgoSMS credentials not set"}

    # Format phone number to 2567... format
    clean_phone = str(to_phone).replace("+", "").replace(" ", "").replace("-", "").strip()
    if clean_phone.startswith("0"):
        clean_phone = "256" + clean_phone[1:]

    # Enforce maximum 159 characters for 1 single SMS credit
    if len(message) > 159:
        message = message[:156] + "..."

    # Verified working EgoSMS query parameters
    params = {
        "method": "sendsms",
        "username": username,
        "password": password,
        "number": clean_phone,
        "message": message
    }
    if sender_id and sender_id.strip():
        params["sender"] = sender_id.strip()

    logger.info(f"[EgoSMS] Sending SMS ({len(message)} chars) to {clean_phone} via {EGOSMS_API_URL}")
    try:
        response = requests.get(EGOSMS_API_URL, params=params, timeout=12)
        logger.info(f"[EgoSMS] Response ({response.status_code}): {response.text}")

        if response.status_code == 200 and '"Status":"OK"' in response.text:
            return {"success": True, "raw_response": response.text}

        # Fallback to POST if needed
        post_res = requests.post(EGOSMS_API_URL, params=params, timeout=12)
        logger.info(f"[EgoSMS Post Fallback] Response ({post_res.status_code}): {post_res.text}")
        if post_res.status_code == 200 and '"Status":"OK"' in post_res.text:
            return {"success": True, "raw_response": post_res.text}

        return {"success": False, "raw_response": response.text}

    except Exception as e:
        logger.error(f"[EgoSMS] Failed to send SMS to {clean_phone}: {e}")
        return {"success": False, "error": str(e)}

def format_donor_first_name(donor_name):
    if not donor_name or not str(donor_name).strip():
        return "Supporter"
    clean_n = str(donor_name).strip()
    first_word = clean_n.split()[0].title()
    return first_word[:12]

def send_kit_purchase_sms(phone, donor_name, kit_name, size, quantity, amount, reference):
    """
    Helper to send a formatted SMS notification to a kit buyer upon payment confirmation.
    Handles single or multiple kits dynamically. Specifies School Main Gate pickup.
    Guaranteed <= 159 characters (1 SMS credit).
    """
    short_name = format_donor_first_name(donor_name)
    size_str = f" ({size})" if size else ""

    try:
        qty_num = int(quantity) if quantity else 1
    except Exception:
        qty_num = 1

    if qty_num > 1:
        item_desc = f"{qty_num}x Kits{size_str}"
    else:
        item_desc = f"Kit{size_str}"

    try:
        formatted_amount = f"UGX {int(float(amount)):,}"
    except Exception:
        formatted_amount = f"UGX {amount}"

    message = (
        f"Mengo SS: Dear {short_name}, payment of {formatted_amount} for {item_desc} "
        f"confirmed! Ref:{reference}. Student/rep pickup at School Main Gate. "
        f"Help:0783279346/0784455449"
    )
    return send_sms(phone, message)

def send_donation_sms(phone, donor_name, amount, reference):
    """
    Helper to send a formatted thanksgiving SMS notification to a donor upon payment confirmation.
    Guaranteed <= 159 characters (1 SMS credit).
    """
    short_name = format_donor_first_name(donor_name)
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
