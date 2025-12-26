'use client'

import Icon from '@/components/Icon'

interface HeaderProps {
  pageTitle?: string
  leftActions?: React.ReactNode
  rightActions?: React.ReactNode
  storeName?: string
}

/**
 * Header Component
 *
 * Top header with page title, store name, and action areas.
 * Supports RTL layout.
 */
export function Header({
  pageTitle,
  leftActions,
  rightActions,
  storeName = 'المتجر',
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side (RTL: appears on right) */}
        <div className="flex items-center gap-4">
          {leftActions}
        </div>

        {/* Center: Page Title */}
        {pageTitle && (
          <div className="flex-1 text-center">
            <h1 className="text-page-title">{pageTitle}</h1>
          </div>
        )}

        {/* Right side (RTL: appears on left) */}
        <div className="flex items-center gap-4">
          {storeName && (
            <span className="hidden sm:inline text-muted text-sm">
              {storeName}
            </span>
          )}
          {rightActions}
        </div>
      </div>
    </header>
  )
}

