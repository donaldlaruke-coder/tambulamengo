#!/bin/sh
set -e

echo "📦 Running Django database migrations..."
python manage.py migrate --noinput

echo "🔄 Retroactively updating historical transaction payment methods..."
python manage.py shell -c "
from api.models import Transaction
airtel_prefixes = ['25670', '25675', '25674', '25679', '25672', '25673', '25671', '25620', '070', '075', '074', '079', '072', '073', '071', '020']
mtn_prefixes = ['25677', '25678', '25676', '25639', '25631', '077', '078', '076', '039', '031']
count = 0
for tx in Transaction.objects.all():
    p = (tx.donor.phone if tx.donor else None) or tx.donor_display_name or ''
    clean_p = str(p).replace('+', '').replace(' ', '').replace('-', '').strip()
    if any(clean_p.startswith(pref) for pref in airtel_prefixes) and tx.payment_method != 'airtel_money':
        tx.payment_method = 'airtel_money'
        tx.save()
        count += 1
    elif any(clean_p.startswith(pref) for pref in mtn_prefixes) and tx.payment_method != 'mtn_momo':
        tx.payment_method = 'mtn_momo'
        tx.save()
        count += 1
print(f'✅ Retroactively updated {count} historical transactions!')
"

echo "🚀 Starting Gunicorn server..."
exec "$@"
