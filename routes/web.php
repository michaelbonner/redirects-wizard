<?php

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', 'BatchController@index');
Route::get('/batch/create', 'BatchController@store');
Route::get('/batch/{batch}', 'BatchController@edit');
Route::get(
    '/batch-dev-url-screenshot/{batch}.jpg',
    'BatchDevUrlScreenshotController@show'
);
