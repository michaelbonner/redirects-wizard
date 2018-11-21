<?php

use Faker\Generator as Faker;
use App\Models\Batch;

$factory->define(App\Models\Url::class, function (Faker $faker) {
    return [
        'batch_id' => function () {
            if (Batch::count()) {
                return Batch::inRandomOrder()->first()->id;
            }
            return factory(Batch::class)->create()->id;
        },
        'url' => $faker->url,
        'redirect_to' => '',
        'addressed' => false,
    ];
});
