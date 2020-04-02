<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Http\Requests\BatchUrlStoreRequest;
use Illuminate\Support\Str;

class BatchUrlController extends Controller
{
    public function store(BatchUrlStoreRequest $request, Batch $batch)
    {
        // apache can't work with things after the hash
        $url = Str::before($request->url, '#');

        // don't create duplicates
        $urlWOTrailingSlash =  Str::endsWith($url, '/') ? substr($url, 0, -1) : $url;
        if (
            $db_url = $batch->urls()
            ->where('url', $urlWOTrailingSlash)
            ->orWhere('url', Str::finish($urlWOTrailingSlash, '/'))
            ->first()
        ) {
            return $db_url;
        };

        $url = $batch->urls()->create([
            'url' => $url,
        ]);

        $url->checkAddressed();
        return $url;
    }
}
