import argparse
import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_project.settings')
django.setup()

from django.contrib.auth import authenticate
from django.contrib.auth.models import User


def main():
    parser = argparse.ArgumentParser(description='Reset one existing user password.')
    parser.add_argument('username', help='Existing username')
    parser.add_argument('password', help='New password')
    args = parser.parse_args()

    try:
        user = User.objects.get(username=args.username)
    except User.DoesNotExist:
        raise SystemExit(f"User '{args.username}' does not exist. Create accounts through the UI registration page.")

    user.set_password(args.password)
    user.save(update_fields=['password'])

    auth_user = authenticate(username=args.username, password=args.password)
    if not auth_user:
        raise SystemExit('Password was saved, but authentication failed.')

    print(f"Password reset for '{args.username}'. Authentication check passed.")


if __name__ == '__main__':
    main()
