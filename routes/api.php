<?php

use App\Http\Controllers\BatchController;
use App\Http\Controllers\BatchRedirectsController;
use App\Http\Controllers\BatchUrlController;
use App\Http\Controllers\UrlController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:api')->get('/user', function (Request $request) {
    return $request->user();
});

Route::patch('/batch/{batch}', [BatchController::class, 'update']);
Route::delete('/batch/{batch}', [BatchController::class, 'destroy']);
Route::post('/batch/{batch}/url', [BatchUrlController::class, 'store']);
Route::get('/batch/{batch}/redirects', [BatchRedirectsController::class, 'show']);
Route::get('/url/{url}/details', [UrlController::class, 'details']);
Route::get('/url/{url}', [UrlController::class, 'show']);
Route::patch('/url/{url}', [UrlController::class, 'update']);
Route::delete('/url/{url}', [UrlController::class, 'destroy']);
