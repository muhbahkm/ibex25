'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import Icon from '@/components/Icon'

interface AppLayoutProps {
  children: React.ReactNode
  pageTitle?: string
  leftActions?: React.ReactNode
  rightActions?: React.ReactNode
}

/**
 * AppLayout Component
 *
 * Global application layout with sidebar and header.
 * Provides consistent structure for all pages.
 * Responsive: sidebar collapses on mobile.
 */
export function AppLayout({
  children,
  pageTitle,
  leftActions,
  rightActions,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:mr-64">
        {/* Header */}
        <Header
          pageTitle={pageTitle}
          leftActions={
            <>
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
                aria-label="فتح القائمة"
              >
                <Icon name="menu" />
              </button>
              {leftActions}
            </>
          }
          rightActions={rightActions}
        />

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

