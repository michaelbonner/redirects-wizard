<?php

use Illuminate\Http\Request;

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

Route::patch('/batch/{batch}', 'BatchController@update');
Route::delete('/batch/{batch}', 'BatchController@destroy');
Route::post('/batch/{batch}/url', 'BatchUrlController@store');
Route::get('/batch/{batch}/redirects', 'BatchRedirectsController@show');
Route::get('/url/{url}', 'UrlController@show');
Route::patch('/url/{url}', 'UrlController@update');
Route::delete('/url/{url}', 'UrlController@destroy');
