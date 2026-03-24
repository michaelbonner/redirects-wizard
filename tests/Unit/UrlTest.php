<?php

use App\Models\Batch;
use App\Models\Url;
use Illuminate\Foundation\Testing\DatabaseMigrations;

uses(DatabaseMigrations::class);

test('can create', function () {
    $url = Url::factory()->create();
    expect($url)->toBeInstanceOf(Url::class);
});

test('can get batch', function () {
    $url = Url::factory()->create();
    expect($url->batch)->toBeInstanceOf(Batch::class);
});
