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

Route::get('/', 'BatchController@index')->middleware('auth');
Route::get('/batch/create', 'BatchController@store')->middleware('auth');
Route::get('/batch/{batch}', 'BatchController@edit')->middleware('auth');
Route::get(
    '/batch-dev-url-screenshot/{batch}.jpg',
    'BatchDevUrlScreenshotController@show'
)->middleware('auth');

Auth::routes();
