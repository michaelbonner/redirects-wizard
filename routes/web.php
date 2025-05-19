<?php

use App\Http\Controllers\BatchController;
use Illuminate\Support\Facades\Route;

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

Route::get('/', [BatchController::class, 'index'])->middleware('auth');
Route::get('/batch/create', [BatchController::class, 'store'])->middleware('auth');
Route::get('/batch/{batch}', [BatchController::class, 'edit'])->middleware('auth');
Route::get('health', \Spatie\Health\Http\Controllers\HealthCheckResultsController::class);

// Route::get(
//     '/batch-dev-url-screenshot/{batch}.jpg',
//     'BatchDevUrlScreenshotController@show'
// )->middleware('auth');

Auth::routes(['register' => true]);

