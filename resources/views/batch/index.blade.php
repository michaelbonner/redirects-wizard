@extends('layouts.master')

@section('title', 'Redirects Wizard')

@section('content')
    <div class="container mx-auto">
        <h1 class="block mt-8 mb-2 px-4 text-grey-darkest">
            Redirect Batches
        </h1>
        <div>
            <p class="mb-6 px-4">
                <a 
                    href="/batch/create" 
                    class="no-underline text-sm font-semibold py-1 leading-normal text-blue"
                >
                    <i class="fas fa-folder-plus"></i>
                    Create New Batch
                </a>
            </p>
        </div>
        <div id="app">
            <div class="px-2 my-8">
                <div class="flex flex-wrap -mx-2">
                    @foreach ($batches as $batch)    
                        @if($batch->urls->count())
                            <batch-component 
                                count_urls="{{ $batch->urls->count() }}" 
                                count_remaining_urls="{{ $batch->remainingToAddressUrls->count() }}" 
                                batch_id="{{ $batch->id}}" 
                                dev_url="{{ $batch->dev_url }}"
                            >
                                <p>
                                    <a href="{{ $batch->dev_url }}">
                                        {{ $batch->dev_url }} ({{ $batch->urls->count() }} URLs)
                                    </a>
                                </p>
                            </batch-component>
                        @endif
                    @endforeach
                </div>
            </div>
        </div>
    </div>
@endsection
