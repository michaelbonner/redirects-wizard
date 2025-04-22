<?php

namespace Tests\Unit;

use App\Models\Batch;
use App\Models\Url;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Tests\TestCase;

class UrlTest extends TestCase
{
    use DatabaseMigrations;

    /** @test */
    public function can_create()
    {
        $url = factory(Url::class)->create();
        $this->assertInstanceOf(Url::class, $url);
    }

    /** @test */
    public function can_get_batch()
    {
        $url = factory(Url::class)->create();
        $this->assertInstanceOf(Batch::class, $url->batch);
    }
}
