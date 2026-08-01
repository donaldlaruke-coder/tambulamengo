# Generated manually for kit collection tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='kit_collected',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='transaction',
            name='kit_collected_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='transaction',
            name='kit_collected_by',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
