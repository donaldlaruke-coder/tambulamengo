from django.core.management.base import BaseCommand
from api.models import CampaignSettings, KitProduct

class Command(BaseCommand):
    help = 'Seeds initial campaign settings and products'

    def handle(self, *args, **options):
        # 1. Seed Campaign Settings
        campaign, created = CampaignSettings.objects.get_or_create(
            id=1,
            defaults={
                'campaign_name': 'Tambula Mengo',
                'tagline': 'Akwana Akira Ayomba — Make friends and never foes.',
                'story': (
                    'For 130 years Mengo Senior School has shaped generations of Ugandan leaders. '
                    'Tambula Mengo is our sponsored walk-and-run to raise funds for the next chapter '
                    '— new learning spaces, bursaries, and safer facilities for every student who '
                    'walks through our gates.'
                ),
                'goal_amount': 18000000000,
                'event_date': '2026-08-15',
                'event_details': (
                    'Join the Tambula Mengo walk & run on Saturday, 15 August. '
                    'Kits collected from the school pavilion the week before. '
                    'Route details announced closer to the day.'
                ),
                'bank_name': 'Stanbic Bank Uganda',
                'bank_account_name': 'Mengo Senior School — Tambula Mengo',
                'bank_account_number': '9030099999999'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Successfully seeded campaign settings.'))
        else:
            self.stdout.write(self.style.WARNING('Campaign settings already exist.'))

        # 2. Seed Kit Products
        kit, created = KitProduct.objects.get_or_create(
            name='Tambula Mengo Run Kit',
            defaults={
                'description': (
                    'Official event kit — branded t-shirt, race number and wristband. '
                    'Collected at the school pavilion the week before the walk.'
                ),
                'price': 30000,
                'size_options': ["S", "M", "L", "XL", "XXL"],
                'active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Successfully seeded default run kit.'))
        else:
            self.stdout.write(self.style.WARNING('Default run kit already exists.'))
