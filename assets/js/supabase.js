"use strict";

const SUPABASE_URL =
    "https://ldfiwmiwxyubppatlyyh.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_iNU8uUkD72JlJ8xVrG8MOw_eCppYMIe";

if (!window.supabase) {
    console.error(
        "Supabase JS não foi carregado."
    );
} else {
    window.supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );
}
