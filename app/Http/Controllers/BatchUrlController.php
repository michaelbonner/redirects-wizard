<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Batch;
use App\Http\Requests\BatchUrlStoreRequest;

class BatchUrlController extends Controller
{
    public function store(BatchUrlStoreRequest $request, Batch $batch)
    {
        // apache can't work with things after the hash
        $url = str_before($request->url, '#');

        // don't create duplicates
        $urlWOTrailingSlash = ends_with($url, '/') ? substr($url, 0, -1) : $url;
        if (
            $db_url = $batch->urls()
                    ->where('url', $urlWOTrailingSlash)
                    ->orWhere('url', str_finish($urlWOTrailingSlash, '/'))
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
