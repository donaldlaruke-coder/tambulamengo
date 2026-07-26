import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

def get_base_url():
    is_sandbox = getattr(settings, 'PESAPAL_SANDBOX', True)
    if is_sandbox:
        return "https://cybspay.pesapal.com/pesapalv3/api"
    else:
        return "https://payg.pesapal.com/v3/api"

def get_auth_token():
    """
    Get JWT Token from Pesapal API V3.
    """
    url = f"{get_base_url()}/Auth/RequestToken"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    payload = {
        "consumer_key": getattr(settings, 'PESAPAL_CONSUMER_KEY', ''),
        "consumer_secret": getattr(settings, 'PESAPAL_CONSUMER_SECRET', '')
    }
    
    logger.info(f"Requesting Pesapal token from {url}")
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        return data.get("token")
    except Exception as e:
        logger.error(f"Error fetching Pesapal token: {e}")
        if 'response' in locals():
            logger.error(f"Pesapal token response error content: {response.text}")
        raise

def register_ipn(token, callback_url):
    """
    Register IPN Notification URL with Pesapal and return IPN ID.
    """
    url = f"{get_base_url()}/URLRegister/RegisterIPN"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {token}"
    }
    payload = {
        "url": callback_url,
        "ipn_notification_type": "GET"
    }
    
    logger.info(f"Registering IPN url {callback_url} with Pesapal")
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        return data.get("ipn_id")
    except Exception as e:
        logger.error(f"Error registering Pesapal IPN: {e}")
        if 'response' in locals():
            logger.error(f"Pesapal IPN registration response error content: {response.text}")
        raise

def submit_order(token, ipn_id, reference, amount, description, email, phone, name, redirect_url):
    """
    Submit order to Pesapal V3 and get hosted payment page redirect URL.
    """
    url = f"{get_base_url()}/Transactions/SubmitOrderRequest"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    # Split name into first and last name for billing info (Pesapal requires them)
    name_parts = (name or "Anonymous Donor").strip().split(None, 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else "Donor"
    
    # Pesapal requires float/decimal format for amount
    payload = {
        "id": reference,
        "amount": float(amount),
        "currency": "UGX",
        "description": description,
        "callback_url": redirect_url,
        "notification_id": ipn_id,
        "billing_address": {
            "email_address": email or "donor@mengo.sc.ug",
            "phone_number": phone or "0772000000",
            "country_code": "UG",
            "first_name": first_name,
            "last_name": last_name
        }
    }
    
    logger.info(f"Submitting order {reference} of {amount} to Pesapal")
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        return data  # Contains redirect_url, order_tracking_id, merchant_reference
    except Exception as e:
        logger.error(f"Error submitting order to Pesapal: {e}")
        if 'response' in locals():
            logger.error(f"Pesapal order submission error content: {response.text}")
        raise

def get_transaction_status(token, order_tracking_id):
    """
    Query the status of a Pesapal transaction.
    """
    url = f"{get_base_url()}/Transactions/GetTransactionStatus?orderTrackingId={order_tracking_id}"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    logger.info(f"Querying Pesapal transaction status for tracking ID: {order_tracking_id}")
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Error querying Pesapal transaction status: {e}")
        if 'response' in locals():
            logger.error(f"Pesapal status query error content: {response.text}")
        raise
