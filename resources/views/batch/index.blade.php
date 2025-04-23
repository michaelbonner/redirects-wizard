@extends('layouts.master')

@section('title', 'Redirects Wizard')

@section('content')
<div class="container mx-auto">
    <h1 class="block mt-8 mb-2 px-4 text-gray-800 text-4xl font-bold">
        Redirect Batches
    </h1>
    <div>
        <p class="mb-6 px-4">
            <a href="/batch/create" class="no-underline text-sm font-semibold py-1 leading-normal text-blue-500">
                <i class="fas fa-folder-plus"></i>
                Create New Batch
            </a>
        </p>
    </div>
    <div id="app">
        <div class="px-2 my-8">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 xl:gap-6">
                @foreach ($batches as $batch)
                @if($batch->urls->count())
                <batch-component count_urls="{{ $batch->urls->count() }}"
                    count_remaining_urls="{{ $batch->remainingToAddressUrls->count() }}" batch_id="{{ $batch->id}}"
                    dev_url="{{ $batch->dev_url }}" date_created="{{ $batch->created_at->format('F d, Y') }}"
                    class="w-full h-full">
                    <div class="h-full rounded-sm overflow-hidden shadow-lg bg-white">
                        <a href="/batch/{{ $batch->id }}">
                            <img src="https://screenshot-maker.bootpack.dev/api/screenshot/?url={{ $batch->dev_url }}"
                                alt="{{ $batch->dev_url }} screenshot" class="w-full"
                                style="min-height: 200px;max-height: 300px;">
                        </a>
                        <div class="px-6 py-4">
                            <div class="font-bold text-lg mb-2 break-words">
                                <a href="/batch/{{ $batch->id }}" class="text-blue-500 no-underline">
                                    {{ $batch->dev_url }}
                                </a>
                            </div>
                            <p class="text-gray-700 text-sm mb-2">
                                Created: {{ $batch->created_at->format('F m, Y') }}
                            </p>
                            <p class="text-gray-700 text-sm">
                                Loading url counts...
                            </p>
                        </div>
                        <div class="px-6 py-4">
                            <a target="_blank" href="{{ $batch->dev_url }}"
                                class="no-underline text-xs font-semibold rounded-sm px-4 py-1 leading-normal bg-white border border-green-500 text-green-500 hover:bg-green-500 hover:text-white ml-2">
                                Visit Site <i class="fas fa-external-link-alt"></i>
                            </a>
                        </div>
                    </div>
                </batch-component>
                @endif
                @endforeach
            </div>
        </div>
    </div>

    <form action="/logout" class="px-2 py-8 flex justify-end" method="POST">
        @csrf
        <button class="no-underline text-sm font-semibold py-1 leading-normal text-blue-500" type="submit">
            <i class="fas fa-sign-out-alt"></i>
            Logout
        </button>
    </form>
</div>
@endsection