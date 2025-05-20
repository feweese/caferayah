# Email Verification System

This document explains how to use and configure the email verification system in the Caférayah application.

## Overview

The email verification system ensures that users register with valid email addresses by requiring them to verify their email before they can log in. This helps prevent spam accounts and ensures we have valid contact information for our customers.

## Features

- Email verification required on registration
- Secure token-based verification links
- Ability to resend verification emails if needed
- Prevention of login until email is verified
- User-friendly error messages and verification pages
- Tokens expire after 24 hours for security

## Configuration

To set up the email verification system, you need to configure email credentials in your environment:

1. Create or update your `.env` file with the following variables:

```
# Email Configuration
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

2. For Gmail, you need to use an App Password instead of your regular password:
   - Go to your Google Account > Security
   - Enable 2-Step Verification if not already enabled
   - Under "App passwords", generate a new app password for the application
   - Use this app password in your `.env` file

3. Ensure the `NEXT_PUBLIC_APP_URL` is correctly set to your application's URL.
   In development, this is typically `http://localhost:3000`.
   In production, it should be your actual domain (e.g., `https://caferayah.com`).

## How It Works

1. **Registration Process**:
   - When a user registers, a verification token is generated
   - An email with a verification link is sent to the user's email address
   - The user account is created but marked as unverified

2. **Verification**:
   - The user clicks the verification link in their email
   - The application validates the token
   - If valid, the user's email is marked as verified

3. **Login Restriction**:
   - If a user tries to log in before verifying their email, they will see an error
   - They can request a new verification email from the login page

## Testing

During development, verification links are logged to the console if the email fails to send. You can use these links to test the verification process without needing to send actual emails.

## Troubleshooting

- **Emails not being sent**: Check your email credentials and make sure your SMTP settings are correct.
- **Verification links not working**: Ensure your `NEXT_PUBLIC_APP_URL` is set correctly.
- **"Invalid token" errors**: Tokens expire after 24 hours. Users will need to request a new verification email.