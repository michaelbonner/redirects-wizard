<?php

use Faker\Generator as Faker;

$sites = collect(
    [
        'https://brightonresort.com/',
        'https://lineskis.com/',
        'https://www.apple.com/',
        'https://www.tesla.com/',
        'https://www.transitionbikes.com/',
    ]
);

$factory->define(App\Models\Batch::class, function (Faker $faker) use ($sites) {
    return [
        'dev_url' => function () use ($sites) {
            return $sites->random();
        },
    ];
});
