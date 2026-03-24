<?php

use App\Models\Batch;
use App\Models\Url;
use Illuminate\Foundation\Testing\DatabaseMigrations;

uses(DatabaseMigrations::class);

test('can create', function () {
    $batch = Batch::factory()->create();
    expect($batch)->toBeInstanceOf(Batch::class);
});

test('can get urls', function () {
    $batch = Batch::factory()->create();
    Url::factory()->create([
        'batch_id' => $batch->id,
    ]);
    expect($batch->urls->first())->toBeInstanceOf(Url::class);
});
