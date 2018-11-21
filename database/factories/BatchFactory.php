<?php

use Faker\Generator as Faker;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Client;

$sites = collect(
    json_decode(
        (new Client)->get('https://redolive.co/sites-json.php')->getBody()
    )
);

$factory->define(App\Models\Batch::class, function (Faker $faker) use ($sites) {
    return [
        'dev_url' => function () use ($sites) {
            return 'https://' . $sites->random();
        }
    ];
});
