import { IconX, IconUser, IconMicrophone, IconShare, IconSettings, IconLogout } from '@tabler/icons-react'

interface SideMenuProps {
  isOpen: boolean
  onClose: () => void
  onProfile: () => void
  onAddPodcast: () => void
  onShareLibrary: () => void
  onSettings: () => void
  onLogout: () => void
}

export function SideMenu({
  isOpen,
  onClose,
  onProfile,
  onAddPodcast,
  onShareLibrary,
  onSettings,
  onLogout,
}: SideMenuProps) {
  if (!isOpen) return null

  const menuItems = [
    {
      icon: IconUser,
      label: 'Profile',
      onClick: onProfile,
      description: 'View/edit name, email',
    },
    {
      icon: IconMicrophone,
      label: 'Add Podcast',
      onClick: onAddPodcast,
      description: 'Subscribe to new podcast',
    },
    {
      icon: IconShare,
      label: 'Share Library',
      onClick: onShareLibrary,
      description: 'Generate shareable URL',
    },
    {
      icon: IconSettings,
      label: 'Settings',
      onClick: onSettings,
      description: 'Notifications, preferences',
    },
    {
      icon: IconLogout,
      label: 'Logout',
      onClick: onLogout,
      description: 'End session',
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} aria-hidden="true" />

      {/* Side Menu */}
      <div
        className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <p className="text-sm text-gray-500">Navigate your podcast library</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close menu"
          >
            <IconX className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {menuItems.map(item => {
              const IconComponent = item.icon
              return (
                <li key={item.label}>
                  <button
                    onClick={() => {
                      item.onClick()
                      onClose()
                    }}
                    className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-red/10 hover:text-red transition-colors group"
                  >
                    <div className="flex-shrink-0 p-2 bg-gray-100 group-hover:bg-red/20 rounded-lg transition-colors">
                      <IconComponent className="w-5 h-5 text-gray-600 group-hover:text-red" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-red">{item.label}</p>
                      <p className="text-xs text-gray-500 group-hover:text-red/70">{item.description}</p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Rewind v0.1.0
            <br />
            Rediscover older podcast episodes
          </p>
        </div>
      </div>
    </>
  )
}
