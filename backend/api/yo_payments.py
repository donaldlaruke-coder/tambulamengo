import logging
import requests
import xml.etree.ElementTree as ET
from django.conf import settings

logger = logging.getLogger(__name__)

def get_base_url():
    is_sandbox = getattr(settings, 'YO_PAYMENTS_SANDBOX', True)
    if is_sandbox:
        return "https://sandbox.yo.co.ug/services/yopaymentsdev/task.php"
    else:
        return "https://paymentsapi1.yo.co.ug/ybs/task.php"

def get_credentials():
    username = getattr(settings, 'YO_PAYMENTS_API_USERNAME', '90002515585')
    password = getattr(settings, 'YO_PAYMENTS_API_PASSWORD', '4053702456')
    return username, password

def deposit_funds(reference, amount, phone, narrative, ipn_url):
    """
    Initiates an acdepositfunds (Pull Method) request with Yo! Payments.
    Sends a Mobile Money USSD prompt directly to customer's phone (MTN/Airtel).
    """
    url = get_base_url()
    username, password = get_credentials()

    # Format phone to international format without + e.g. 256772123456
    clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
    if clean_phone.startswith("0"):
        clean_phone = "256" + clean_phone[1:]

    xml_request = f"""<?xml version="1.0" encoding="UTF-8"?>
<AutoCreate>
  <Request>
    <APIUsername>{username}</APIUsername>
    <APIPassword>{password}</APIPassword>
    <Method>acdepositfunds</Method>
    <NonBlocking>TRUE</NonBlocking>
    <Amount>{float(amount)}</Amount>
    <Account>{clean_phone}</Account>
    <Narrative>{narrative}</Narrative>
    <ExternalReference>{reference}</ExternalReference>
    <InstantNotificationUrl>{ipn_url}</InstantNotificationUrl>
    <FailureNotificationUrl>{ipn_url}</FailureNotificationUrl>
  </Request>
</AutoCreate>"""

    headers = {
        "Content-Type": "text/xml; charset=utf-8",
        "Content-Url": url
    }

    logger.info(f"Submitting Yo! Payments acdepositfunds request for {reference} to {url}")
    try:
        response = requests.post(url, data=xml_request.encode('utf-8'), headers=headers, timeout=20)
        logger.info(f"Yo! Payments raw response: {response.text}")
        response.raise_for_status()

        # Parse XML response
        root = ET.fromstring(response.content)
        resp_elem = root.find("Response")
        if resp_elem is None:
            resp_elem = root

        def get_text(tag):
            el = resp_elem.find(tag)
            return el.text if el is not None else None

        status = get_text("Status")
        status_code = get_text("StatusCode")
        status_detail = get_text("StatusDetail")
        transaction_status = get_text("TransactionStatus")
        transaction_ref = get_text("TransactionReference") or get_text("TransactionID")
        issued_id = get_text("IssuedID")

        return {
            "status": status,
            "status_code": status_code,
            "status_detail": status_detail,
            "transaction_status": transaction_status,
            "transaction_reference": transaction_ref,
            "issued_id": issued_id,
            "raw_response": response.text
        }
    except Exception as e:
        logger.error(f"Error executing Yo! Payments deposit_funds: {e}")
        if 'response' in locals():
            logger.error(f"Yo! error content: {response.text}")
        raise

def check_transaction_status(reference, transaction_reference=None):
    """
    Queries Yo! Payments for transaction status using actransactioncheckstatus method.
    """
    url = get_base_url()
    username, password = get_credentials()

    if transaction_reference:
        ref_field = f"<TransactionReference>{transaction_reference}</TransactionReference>"
    else:
        ref_field = f"<DepositTransactionSucceededExternalReference>{reference}</DepositTransactionSucceededExternalReference>"

    xml_request = f"""<?xml version="1.0" encoding="UTF-8"?>
<AutoCreate>
  <Request>
    <APIUsername>{username}</APIUsername>
    <APIPassword>{password}</APIPassword>
    <Method>actransactioncheckstatus</Method>
    {ref_field}
  </Request>
</AutoCreate>"""

    headers = {
        "Content-Type": "text/xml; charset=utf-8",
        "Content-Url": url
    }

    logger.info(f"Checking Yo! Payments transaction status for {reference} / {transaction_reference}")
    try:
        response = requests.post(url, data=xml_request.encode('utf-8'), headers=headers, timeout=15)
        response.raise_for_status()

        root = ET.fromstring(response.content)
        resp_elem = root.find("Response")
        if resp_elem is None:
            resp_elem = root

        def get_text(tag):
            el = resp_elem.find(tag)
            return el.text if el is not None else None

        transaction_status = get_text("TransactionStatus")
        status = get_text("Status")

        return {
            "status": status,
            "transaction_status": transaction_status,
            "momo_ref": get_text("MNOTransactionReferenceId") or get_text("MNOTransactionReference"),
            "amount": get_text("Amount"),
            "raw_response": response.text
        }
    except Exception as e:
        logger.error(f"Error checking Yo! Payments status: {e}")
        raise
