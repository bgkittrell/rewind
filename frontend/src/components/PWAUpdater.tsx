import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PWAUpdater() {
  const [updateNotificationElement, setUpdateNotificationElement] = useState<HTMLDivElement | null>(null)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error: Error) {
      console.log('SW registration error:', error)
    },
    onOfflineReady() {
      console.log('App ready to work offline')
    },
    onNeedRefresh() {
      console.log('New content available, click on reload button to update')
    },
  })

  useEffect(() => {
    if (needRefresh && !updateNotificationElement) {
      const notificationElement = document.createElement('div')
      notificationElement.className = 'fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-3 shadow-lg'

      // Create elements safely without innerHTML
      const container = document.createElement('div')
      container.className = 'flex justify-between items-center max-w-7xl mx-auto'

      const message = document.createElement('span')
      message.textContent = 'New app version available!'

      const buttonContainer = document.createElement('div')
      buttonContainer.className = 'flex gap-2 ml-4'

      const updateButton = document.createElement('button')
      updateButton.className = 'bg-white text-red-500 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100'
      updateButton.textContent = 'Update'
      updateButton.onclick = () => {
        updateServiceWorker(true)
      }

      const dismissButton = document.createElement('button')
      dismissButton.className = 'text-white hover:text-gray-200 text-sm'
      dismissButton.textContent = 'Dismiss'
      dismissButton.onclick = () => {
        setNeedRefresh(false)
        if (notificationElement.parentNode) {
          document.body.removeChild(notificationElement)
        }
        setUpdateNotificationElement(null)
      }

      buttonContainer.appendChild(updateButton)
      buttonContainer.appendChild(dismissButton)
      container.appendChild(message)
      container.appendChild(buttonContainer)
      notificationElement.appendChild(container)

      document.body.appendChild(notificationElement)
      setUpdateNotificationElement(notificationElement)
    }
  }, [needRefresh, updateNotificationElement, updateServiceWorker, setNeedRefresh])

  useEffect(() => {
    if (!needRefresh && updateNotificationElement) {
      if (updateNotificationElement.parentNode) {
        document.body.removeChild(updateNotificationElement)
      }
      setUpdateNotificationElement(null)
    }
  }, [needRefresh, updateNotificationElement])

  // This component doesn't render anything, it just handles PWA updates
  return null
}
