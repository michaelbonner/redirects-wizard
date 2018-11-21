<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Batch;
use App\Classes\UrlChecker;

class BatchRedirectsController extends Controller
{
    public function show(Batch $batch)
    {
        echo "<pre>";
        echo "RewriteEngine On \n";
        $batch->urls()
            ->where('addressed', 0)
            ->whereNotNull('redirect_to')
            ->get()
            ->sortBy('rewrite')
            ->sortByDesc(function ($url, $key) {
                return strlen($url->rewrite);
            })
            ->each(function ($url) {
                echo $url->rewrite;
                echo "\n";
            });
        echo "</pre>";

        return response('');
    }
}
