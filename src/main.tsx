import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createAppRouter } from '@/router'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Missing #root element in index.html')

const router = createAppRouter()

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
