ssh redolive.co << EOF
cd sites/redirects.redolive.co
git pull origin master
composer install
php artisan migrate --force
EOF
