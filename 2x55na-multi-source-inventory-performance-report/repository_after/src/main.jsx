import React from 'react'
import ReactDOM from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import { InventoryHealthView } from '../view'
import './index.css'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
const supabaseClient = createClient(supabaseUrl, supabaseKey)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <InventoryHealthView supabaseClient={supabaseClient} />
  </React.StrictMode>,
)
