@extends('layouts.master')

@section('title', $title ?? 'Redirects Wizard')

@section('content')
<div class="container mx-auto">
    <h1 class="block mt-8 mb-2 px-4 text-gray-800 text-4xl font-bold">
        Redirect Batch
    </h1>
    <p class="mb-6 px-4">
        <a href="/" class="no-underline text-sm font-semibold rounded-sm text-blue-500 py-1 leading-normal">
            <i class="fas fa-home"></i>
            Home
        </a>
    </p>
    <div id="app">
        <batch-edit-component :urls="{{ $urls }}" batch_id="{{ $batch->id}}" dev_url="{{ $batch->dev_url }}">
        </batch-edit-component>
    </div>
</div>
@endsection