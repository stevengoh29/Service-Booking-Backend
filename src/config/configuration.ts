export default () => ({
    database: {
        url: process.env.DATABASE_URL
    },

    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
    },
});