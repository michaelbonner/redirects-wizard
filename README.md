# Redirects Wizard

## Prerequisites

- PHP
- Database

I like using [Laravel Valet](https://laravel.com/docs/5.7/valet). You should check it out if you haven't already.

## Getting started

1. Clone this repo
1. Copy `.env.example` to `.env` and update your details
1. Run `composer install`
1. Run `php artisan key:generate`
1. Run `php artisan migrate`

## Building Redirects

1. Click "Create New Batch" from the front page.
1. Enter the "Dev URL." This is the URL you are actively developing the site on.
1. Add the known URLs
1. The system will automatically hit each URL at the dev url to determine whether or not a redirect is necessary.
1. Once you've entered where each URL will go, click the "View Rewrites" button.
1. Copy and paste the rewrite rules into your vhost config or .htaccess file.
1. Click the "Recheck Unaddressed" button to see if your redirects were successful.