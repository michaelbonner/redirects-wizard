<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use App\Models\Url;
use App\Models\Batch;

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
